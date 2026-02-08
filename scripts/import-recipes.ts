#!/usr/bin/env npx tsx

/**
 * Recipe Import Script
 *
 * Imports recipes from Daily Grains Export HTML files into the database.
 *
 * Usage:
 *   npx tsx scripts/import-recipes.ts --category sourdough
 *   npx tsx scripts/import-recipes.ts --category cookies
 *   npx tsx scripts/import-recipes.ts --category muffins
 *   npx tsx scripts/import-recipes.ts --all
 *   npx tsx scripts/import-recipes.ts --dry-run --category sourdough
 */

import * as fs from 'fs';
import * as path from 'path';
import * as cheerio from 'cheerio';
import { PrismaClient } from '../src/generated/prisma';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

const prisma = new PrismaClient();

// Recipe categories with their recipe names
const RECIPE_CATEGORIES = {
  sourdough: [
    'Apricot and Thyme Sourdough Bread',
    'Butterfly Pea Flower Swirl Sourdough Bread',
    'Chia Pudding Sourdough Bread',
    'Corn Porridge and Rosemary Sourdough Bread',
    'Desembrood (Whole Grain Sourdough Bread)',
    'Durum Wheat Sourdough Bread',
    'Einkorn Sourdough Hearth Bread',
    'Honey Oat Sourdough Bread',
    'Kamut® (Khorasan) Sourdough Bread',
    'Kernza® Artisan-Style Bread (Sourdough and Yeast)',
    'Maple Oat and Wheat Sourdough Bread',
    'Purple Sweet Potato Sourdough Bread',
    'RMSA Einkorn Kitchen Trials Sourdough +10',
    'RMSA Inclusion Kitchen Trials Sourdough',
    'RMSA Kitchen Trials Sourdough',
    'RMSA Rosemary Kitchen Trials Sourdough',
    'RMSA Sesame Kitchen Trials Sourdough',
    'Rye Chocolate Cherry Sourdough',
    'Seeded Rouge Sourdough Bread',
    'Sourdough Beer Bread',
    'Sourdough Bread with Chocolate Chips, Walnuts, and Flaxmeal',
    'Spelt and Kamut Whole Grain Sourdough Bread',
    'Spelt and Rye-Scald Sourdough Bread',
    'with-A-Touch-Of-Soft-Wheat Sourdough',
  ],
  muffins: ['Spelt Sourdough English Muffins'],
  cookies: [
    'Apple Pie Cookie',
    'Brown Butter Dark Chocolate Chip Cookies',
    'Brown Butter Milk Chocolate Pecan Chip Cookies',
    'Brown Butter White Chocolate Cherry Pistachio Cookies',
    'Einkorn Chocolate Mint Chunk Cookies (with Sourdough)',
    'IP White Chocolate, Pistachio, And Dried Cherry Cookie',
    'Lemon Spelt Crinkle Cookies',
    'Oatmeal Raisin Cookie',
    'Spiced Molasses Cookie',
    'Triple Chocolate Cookies',
    'Whole Wheat and Rye Chocolate Chip Cookies',
  ],
} as const;

// Configuration
const EXPORT_DIR = path.join(process.cwd(), 'Daily Grains Export', 'Recipes');

interface ParsedIngredient {
  rawLine: string;
  quantity: number | null;
  unit: string;
  name: string;
  isSectionHeader: boolean;
}

interface ParsedRecipe {
  name: string;
  description: string | null;
  yieldQty: number;
  yieldUnit: string;
  sections: Array<{
    name: string;
    order: number;
    instructions: string;
    ingredients: ParsedIngredient[];
  }>;
  sourceFile: string;
}

interface ImportStats {
  recipesImported: number;
  recipesSkipped: number;
  ingredientsCreated: string[];
  ingredientsReused: string[];
  errors: string[];
}

/**
 * Parse a quantity string that may contain fractions (including Unicode)
 */
function parseQuantity(str: string): number | null {
  if (!str || !str.trim()) return null;

  let text = str.trim();

  // Replace Unicode fractions with decimal equivalents
  const fractionMap: Record<string, number> = {
    '½': 0.5,
    '⅓': 0.333,
    '⅔': 0.667,
    '¼': 0.25,
    '¾': 0.75,
    '⅕': 0.2,
    '⅖': 0.4,
    '⅗': 0.6,
    '⅘': 0.8,
    '⅙': 0.167,
    '⅚': 0.833,
    '⅛': 0.125,
    '⅜': 0.375,
    '⅝': 0.625,
    '⅞': 0.875,
  };

  // Check for mixed fractions like "1 ½"
  for (const [frac, val] of Object.entries(fractionMap)) {
    if (text.includes(frac)) {
      const parts = text.split(frac);
      const whole = parseFloat(parts[0].trim()) || 0;
      return whole + val;
    }
  }

  // Handle ASCII fractions like "1/2"
  if (text.includes('/')) {
    const parts = text.split('/');
    if (parts.length === 2) {
      // Could be "1 1/2" format
      const beforeSlash = parts[0].trim();
      const afterSlash = parseFloat(parts[1].trim());

      if (beforeSlash.includes(' ')) {
        // Mixed fraction like "1 1/2"
        const [whole, num] = beforeSlash.split(/\s+/);
        return parseFloat(whole) + parseFloat(num) / afterSlash;
      } else {
        // Simple fraction like "1/2"
        return parseFloat(beforeSlash) / afterSlash;
      }
    }
  }

  // Simple number
  const parsed = parseFloat(text);
  return isNaN(parsed) ? null : parsed;
}

/**
 * Parse an ingredient line like "<strong>203</strong> grams hard red spring wheat flour"
 */
function parseIngredientLine(html: string): ParsedIngredient {
  const $ = cheerio.load(html);

  // Get the raw text content
  const rawLine = $.text().trim();

  // Check if this is a section header (e.g., "POOLISH:", "FINAL DOUGH:")
  const strongText = $('strong').first().text().trim();
  if (strongText.endsWith(':') && !$.text().replace(strongText, '').trim()) {
    return {
      rawLine,
      quantity: null,
      unit: '',
      name: strongText.replace(':', '').trim(),
      isSectionHeader: true,
    };
  }

  // Check for plain text section headers (no strong tag, just text)
  // These are typically short labels like "Levain", "Main dough", "Dough", "Blue Dough", etc.
  const sectionHeaderPatterns = [
    /^(Levain|Main\s+[Dd]ough|Dough|Final\s+[Dd]ough|Blue\s+[Dd]ough|White\s+[Dd]ough)$/i,
    /^(Desem|Porridge|Chia\s+Pudding|Cookie\s+Batter|Coating)$/i,
    /^(For\s+the\s+\w+)$/i,
  ];

  if (!strongText && sectionHeaderPatterns.some(p => p.test(rawLine))) {
    return {
      rawLine,
      quantity: null,
      unit: '',
      name: rawLine,
      isSectionHeader: true,
    };
  }

  // Check for non-quantifiable lines (notes, labels, etc.)
  if (rawLine.match(/^(Cookie Batter|Coating|optional|Add \d|^\* |^Total:|^for the crust|Rolled or flakes)/i)) {
    return {
      rawLine,
      quantity: null,
      unit: '',
      name: '',
      isSectionHeader: false,
    };
  }

  // Extract quantity from <strong> tag
  const quantityStr = strongText;
  let quantity: number | null = parseQuantity(quantityStr);
  let remainingText = $.text().replace(strongText, '').trim();

  // Parse unit and ingredient name
  let unit = 'each';
  let name = remainingText;

  // Check for metric conversion pattern like "stick / 115 g"
  const metricConversionMatch = remainingText.match(
    /^[^\/]+\/\s*(\d+(?:\.\d+)?)\s*(g|grams?|kg|ml|l|oz)\s+(.+)$/i
  );
  if (metricConversionMatch) {
    quantity = parseFloat(metricConversionMatch[1]);
    unit = normalizeUnit(metricConversionMatch[2]);
    name = metricConversionMatch[3].trim();
  } else {
    // Standard pattern: "unit ingredient name" or just "ingredient name"
    // Be more specific about unit patterns to avoid matching "large" as "l"
    const unitMatch = remainingText.match(
      /^(grams?|kg|kilograms?|ml|milliliters?|liters?|oz|ounces?|lbs?|pounds?|cups?|tsp|teaspoons?|tbsp|tablespoons?)\s+(.+)$/i
    );
    if (unitMatch) {
      unit = normalizeUnit(unitMatch[1]);
      name = unitMatch[2].trim();
    } else {
      // Check if the unit is attached to the ingredient start (e.g., "g All-Purpose Flour")
      // Only match single-letter units at word boundary
      const attachedUnitMatch = remainingText.match(/^(g|kg|ml|oz|lb)\s+(.+)$/i);
      if (attachedUnitMatch) {
        unit = normalizeUnit(attachedUnitMatch[1]);
        name = attachedUnitMatch[2].trim();
      } else {
        // Check for patterns like "large eggs", "stick butter"
        const modifierMatch = remainingText.match(
          /^(large|medium|small|stick|sticks)\s+(.+)$/i
        );
        if (modifierMatch) {
          const modifier = modifierMatch[1].toLowerCase();
          name = modifierMatch[2].trim();
          if (modifier === 'stick' || modifier === 'sticks') {
            // Convert sticks to grams (1 stick = 113g butter)
            unit = 'g';
            quantity = (quantity || 1) * 113;
            // Keep butter in the name
            if (!name.toLowerCase().includes('butter')) {
              name = name + ' butter';
            }
          } else {
            unit = 'each';
            name = `${modifier} ${name}`;
          }
        } else {
          // No unit found - check for "t" or "T" at start (teaspoon/tablespoon)
          const tspTbspMatch = remainingText.match(/^([tT])\s+(.+)$/);
          if (tspTbspMatch) {
            unit = tspTbspMatch[1] === 't' ? 'tsp' : 'tbsp';
            name = tspTbspMatch[2].trim();
          } else {
            // No recognizable unit - use remaining text as name
            name = remainingText;
          }
        }
      }
    }
  }

  // Clean up ingredient name
  name = cleanIngredientName(name);

  return {
    rawLine,
    quantity,
    unit,
    name,
    isSectionHeader: false,
  };
}

/**
 * Normalize unit abbreviations to standard forms
 */
function normalizeUnit(unit: string): string {
  const normalized = unit.toLowerCase().trim();
  const unitMap: Record<string, string> = {
    g: 'g',
    gram: 'g',
    grams: 'g',
    kg: 'kg',
    kilogram: 'kg',
    kilograms: 'kg',
    ml: 'ml',
    milliliter: 'ml',
    milliliters: 'ml',
    l: 'l',
    liter: 'l',
    liters: 'l',
    oz: 'oz',
    ounce: 'oz',
    ounces: 'oz',
    lb: 'lb',
    lbs: 'lb',
    pound: 'lb',
    pounds: 'lb',
    cup: 'cup',
    cups: 'cup',
    t: 'tsp',
    tsp: 'tsp',
    teaspoon: 'tsp',
    teaspoons: 'tsp',
    T: 'tbsp',
    tbsp: 'tbsp',
    tablespoon: 'tbsp',
    tablespoons: 'tbsp',
  };
  return unitMap[normalized] || normalized;
}

/**
 * Clean up ingredient name by removing extra info
 */
function cleanIngredientName(name: string): string {
  let cleaned = name;

  // Remove parenthetical notes (measurements, notes, etc.)
  cleaned = cleaned.replace(/\([^)]*\)/g, '');

  // Remove common trailing notes
  cleaned = cleaned.replace(/,\s*at room temperature/gi, '');
  cleaned = cleaned.replace(/,\s*soaked in water/gi, '');
  cleaned = cleaned.replace(/,\s*for topping/gi, '');
  cleaned = cleaned.replace(/,\s*softened/gi, '');
  cleaned = cleaned.replace(/,\s*melted/gi, '');
  cleaned = cleaned.replace(/,\s*plus more for.*$/gi, '');
  cleaned = cleaned.replace(/\s*-\s*FREEZE.*$/gi, '');

  // Remove measurement notes that leaked into the name
  cleaned = cleaned.replace(/\d+\s*cups?/gi, '');
  cleaned = cleaned.replace(/\d+\s*tbsp?/gi, '');
  cleaned = cleaned.replace(/\d+\s*tsp?/gi, '');
  cleaned = cleaned.replace(/~\s*\d+\/\d+\s*cup/gi, '');

  // Clean up leading/trailing punctuation and whitespace
  cleaned = cleaned.replace(/^[,\s\-\/]+/, '');
  cleaned = cleaned.replace(/[,\s\-\/]+$/, '');
  cleaned = cleaned.replace(/\s+/g, ' ').trim();

  // Remove trailing periods
  cleaned = cleaned.replace(/\.$/, '');

  return cleaned;
}

/**
 * Parse instructions into a readable format
 */
function parseInstructions(html: string): string {
  const $ = cheerio.load(html);
  const lines: string[] = [];

  $('p.line').each((_, el) => {
    const text = $(el).text().trim();
    if (text) {
      lines.push(text);
    }
  });

  // Join with double newlines for paragraph breaks
  return lines.join('\n\n');
}

/**
 * Parse an HTML recipe file
 */
function parseRecipeFile(filePath: string): ParsedRecipe | null {
  const html = fs.readFileSync(filePath, 'utf-8');
  const $ = cheerio.load(html);

  // Extract recipe name
  const name = $('h1[itemprop="name"]').text().trim();
  if (!name) {
    console.warn(`No recipe name found in ${filePath}`);
    return null;
  }

  // Extract description (optional)
  const description = $('div[itemprop="description"]').text().trim() || null;

  // Extract ingredients
  const ingredientElements = $('p[itemprop="recipeIngredient"]');
  const ingredients: ParsedIngredient[] = [];

  ingredientElements.each((_, el) => {
    const ingredientHtml = $.html(el);
    const parsed = parseIngredientLine(ingredientHtml);
    ingredients.push(parsed);
  });

  // Extract instructions
  const instructionsHtml = $('div[itemprop="recipeInstructions"]').html() || '';
  const instructions = parseInstructions(instructionsHtml);

  // Group ingredients into sections if section headers are present
  const sections: ParsedRecipe['sections'] = [];
  let currentSection: ParsedRecipe['sections'][0] = {
    name: 'Main',
    order: 0,
    instructions: '',
    ingredients: [],
  };

  for (const ingredient of ingredients) {
    if (ingredient.isSectionHeader) {
      // Start a new section
      if (currentSection.ingredients.length > 0 || sections.length === 0) {
        if (currentSection.ingredients.length > 0) {
          sections.push(currentSection);
        }
        currentSection = {
          name: ingredient.name,
          order: sections.length,
          instructions: '',
          ingredients: [],
        };
      } else {
        currentSection.name = ingredient.name;
      }
    } else if (ingredient.quantity !== null || ingredient.name) {
      // Skip lines like "Total: 1090g"
      if (!ingredient.rawLine.toLowerCase().startsWith('total:')) {
        currentSection.ingredients.push(ingredient);
      }
    }
  }

  // Add the last section
  if (currentSection.ingredients.length > 0) {
    sections.push(currentSection);
  }

  // If no sections were created, create a default one
  if (sections.length === 0) {
    sections.push({
      name: 'Main',
      order: 0,
      instructions: instructions,
      ingredients: [],
    });
  } else {
    // Add instructions to the first section (or could distribute based on headers)
    sections[0].instructions = instructions;
  }

  // Default yield if not specified
  const yieldQty = 1;
  const yieldUnit = 'batch';

  return {
    name,
    description,
    yieldQty,
    yieldUnit,
    sections,
    sourceFile: path.basename(filePath),
  };
}

/**
 * Find or create an ingredient in the database
 */
async function findOrCreateIngredient(
  name: string,
  unit: string,
  bakeryId: string,
  existingIngredients: Map<string, { id: string; name: string; unit: string }>,
  stats: ImportStats,
  dryRun: boolean
): Promise<string | null> {
  // Normalize name for matching
  const normalizedName = name.toLowerCase().trim();

  // Try exact match first
  for (const [, ing] of existingIngredients) {
    if (ing.name.toLowerCase() === normalizedName) {
      if (!stats.ingredientsReused.includes(ing.name)) {
        stats.ingredientsReused.push(ing.name);
      }
      return ing.id;
    }
  }

  // Try fuzzy match (contains)
  for (const [, ing] of existingIngredients) {
    const ingName = ing.name.toLowerCase();
    if (
      ingName.includes(normalizedName) ||
      normalizedName.includes(ingName)
    ) {
      if (!stats.ingredientsReused.includes(ing.name)) {
        stats.ingredientsReused.push(ing.name);
      }
      return ing.id;
    }
  }

  // Create new ingredient
  if (dryRun) {
    console.log(`  [DRY RUN] Would create ingredient: "${name}" (${unit})`);
    stats.ingredientsCreated.push(name);
    return 'dry-run-id';
  }

  try {
    const ingredient = await prisma.ingredient.create({
      data: {
        bakeryId,
        name,
        unit,
      },
    });
    existingIngredients.set(ingredient.id, ingredient);
    stats.ingredientsCreated.push(name);
    console.log(`  Created ingredient: "${name}" (${unit})`);
    return ingredient.id;
  } catch (error) {
    console.error(`  Failed to create ingredient "${name}":`, error);
    stats.errors.push(`Failed to create ingredient "${name}"`);
    return null;
  }
}

/**
 * Import a parsed recipe into the database
 */
async function importRecipe(
  recipe: ParsedRecipe,
  bakeryId: string,
  existingIngredients: Map<string, { id: string; name: string; unit: string }>,
  existingRecipes: Set<string>,
  stats: ImportStats,
  dryRun: boolean
): Promise<boolean> {
  // Check if recipe already exists
  if (existingRecipes.has(recipe.name.toLowerCase())) {
    console.log(`  Skipping "${recipe.name}" - already exists`);
    stats.recipesSkipped++;
    return false;
  }

  console.log(`\nImporting: ${recipe.name}`);
  console.log(`  Source: ${recipe.sourceFile}`);
  console.log(`  Sections: ${recipe.sections.length}`);

  // Build sections data with ingredient IDs
  const sectionsData = [];
  for (const section of recipe.sections) {
    const ingredientsData = [];

    for (const ing of section.ingredients) {
      if (!ing.name || ing.quantity === null) {
        console.log(`  Skipping ingredient with no name or quantity: "${ing.rawLine}"`);
        continue;
      }

      const ingredientId = await findOrCreateIngredient(
        ing.name,
        ing.unit,
        bakeryId,
        existingIngredients,
        stats,
        dryRun
      );

      if (ingredientId) {
        ingredientsData.push({
          ingredientId,
          quantity: ing.quantity,
          unit: ing.unit,
        });
      }
    }

    sectionsData.push({
      name: section.name,
      order: section.order,
      instructions: section.instructions,
      ingredients: ingredientsData,
    });
  }

  if (dryRun) {
    console.log(`  [DRY RUN] Would create recipe with ${sectionsData.length} sections`);
    for (const section of sectionsData) {
      console.log(`    Section "${section.name}": ${section.ingredients.length} ingredients`);
    }
    stats.recipesImported++;
    return true;
  }

  try {
    await prisma.recipe.create({
      data: {
        bakeryId,
        name: recipe.name,
        description: recipe.description,
        yieldQty: recipe.yieldQty,
        yieldUnit: recipe.yieldUnit,
        sections: {
          create: sectionsData.map((section) => ({
            name: section.name,
            order: section.order,
            instructions: section.instructions,
            ingredients: {
              create: section.ingredients,
            },
          })),
        },
      },
    });
    console.log(`  ✓ Created recipe: ${recipe.name}`);
    stats.recipesImported++;
    return true;
  } catch (error) {
    console.error(`  ✗ Failed to create recipe "${recipe.name}":`, error);
    stats.errors.push(`Failed to create recipe "${recipe.name}"`);
    return false;
  }
}

/**
 * Get the bakery ID (assumes single bakery for now)
 */
async function getBakeryId(): Promise<string> {
  const bakery = await prisma.bakery.findFirst();
  if (!bakery) {
    throw new Error('No bakery found. Please create a bakery first.');
  }
  return bakery.id;
}

/**
 * Load existing ingredients into a map for quick lookup
 */
async function loadExistingIngredients(
  bakeryId: string
): Promise<Map<string, { id: string; name: string; unit: string }>> {
  const ingredients = await prisma.ingredient.findMany({
    where: { bakeryId },
    select: { id: true, name: true, unit: true },
  });

  const map = new Map();
  for (const ing of ingredients) {
    map.set(ing.id, ing);
  }
  return map;
}

/**
 * Load existing recipe names for duplicate detection
 */
async function loadExistingRecipes(bakeryId: string): Promise<Set<string>> {
  const recipes = await prisma.recipe.findMany({
    where: { bakeryId },
    select: { name: true },
  });

  return new Set(recipes.map((r) => r.name.toLowerCase()));
}

/**
 * Get recipes to import based on category filter
 */
function getRecipesToImport(category: string | null): string[] {
  if (category === 'all') {
    return [
      ...RECIPE_CATEGORIES.sourdough,
      ...RECIPE_CATEGORIES.muffins,
      ...RECIPE_CATEGORIES.cookies,
    ];
  }

  if (category && category in RECIPE_CATEGORIES) {
    return [...RECIPE_CATEGORIES[category as keyof typeof RECIPE_CATEGORIES]];
  }

  return [];
}

/**
 * Find HTML file for a recipe name
 */
function findRecipeFile(recipeName: string): string | null {
  // Try exact match first
  const exactPath = path.join(EXPORT_DIR, `${recipeName}.html`);
  if (fs.existsSync(exactPath)) {
    return exactPath;
  }

  // List all files and find a match
  const files = fs.readdirSync(EXPORT_DIR);
  for (const file of files) {
    if (file.endsWith('.html')) {
      const nameFromFile = file.replace('.html', '');
      if (nameFromFile.toLowerCase() === recipeName.toLowerCase()) {
        return path.join(EXPORT_DIR, file);
      }
    }
  }

  return null;
}

/**
 * Main function
 */
async function main() {
  const args = process.argv.slice(2);

  // Parse arguments
  let category: string | null = null;
  let dryRun = false;

  for (let i = 0; i < args.length; i++) {
    if (args[i] === '--category' && args[i + 1]) {
      category = args[i + 1];
      i++;
    } else if (args[i] === '--all') {
      category = 'all';
    } else if (args[i] === '--dry-run') {
      dryRun = true;
    }
  }

  if (!category) {
    console.log('Usage:');
    console.log('  npx tsx scripts/import-recipes.ts --category sourdough');
    console.log('  npx tsx scripts/import-recipes.ts --category cookies');
    console.log('  npx tsx scripts/import-recipes.ts --category muffins');
    console.log('  npx tsx scripts/import-recipes.ts --all');
    console.log('  npx tsx scripts/import-recipes.ts --dry-run --category sourdough');
    console.log('\nCategories:');
    console.log(`  sourdough: ${RECIPE_CATEGORIES.sourdough.length} recipes`);
    console.log(`  cookies: ${RECIPE_CATEGORIES.cookies.length} recipes`);
    console.log(`  muffins: ${RECIPE_CATEGORIES.muffins.length} recipes`);
    process.exit(1);
  }

  console.log('='.repeat(60));
  console.log('Recipe Import Script');
  console.log('='.repeat(60));
  if (dryRun) {
    console.log('*** DRY RUN MODE - No changes will be made ***\n');
  }

  // Check export directory
  if (!fs.existsSync(EXPORT_DIR)) {
    console.error(`Export directory not found: ${EXPORT_DIR}`);
    process.exit(1);
  }

  // Get bakery ID
  const bakeryId = await getBakeryId();
  console.log(`Bakery ID: ${bakeryId}`);

  // Load existing data
  const existingIngredients = await loadExistingIngredients(bakeryId);
  const existingRecipes = await loadExistingRecipes(bakeryId);
  console.log(`Existing ingredients: ${existingIngredients.size}`);
  console.log(`Existing recipes: ${existingRecipes.size}`);

  // Get recipes to import
  const recipesToImport = getRecipesToImport(category);
  console.log(`\nRecipes to import (${category}): ${recipesToImport.length}`);

  const stats: ImportStats = {
    recipesImported: 0,
    recipesSkipped: 0,
    ingredientsCreated: [],
    ingredientsReused: [],
    errors: [],
  };

  // Process each recipe
  for (const recipeName of recipesToImport) {
    const filePath = findRecipeFile(recipeName);

    if (!filePath) {
      console.log(`\n⚠ File not found for: ${recipeName}`);
      stats.errors.push(`File not found: ${recipeName}`);
      continue;
    }

    const parsed = parseRecipeFile(filePath);
    if (!parsed) {
      console.log(`\n⚠ Failed to parse: ${recipeName}`);
      stats.errors.push(`Failed to parse: ${recipeName}`);
      continue;
    }

    await importRecipe(
      parsed,
      bakeryId,
      existingIngredients,
      existingRecipes,
      stats,
      dryRun
    );
  }

  // Print summary
  console.log('\n' + '='.repeat(60));
  console.log('Import Summary');
  console.log('='.repeat(60));
  console.log(`Recipes imported: ${stats.recipesImported}`);
  console.log(`Recipes skipped (already exist): ${stats.recipesSkipped}`);
  console.log(`Ingredients created: ${stats.ingredientsCreated.length}`);
  console.log(`Ingredients reused: ${stats.ingredientsReused.length}`);

  if (stats.ingredientsCreated.length > 0) {
    console.log('\nNew ingredients created:');
    for (const name of stats.ingredientsCreated) {
      console.log(`  - ${name}`);
    }
  }

  if (stats.errors.length > 0) {
    console.log('\nErrors:');
    for (const error of stats.errors) {
      console.log(`  ✗ ${error}`);
    }
  }

  await prisma.$disconnect();
}

main().catch((error) => {
  console.error('Fatal error:', error);
  prisma.$disconnect();
  process.exit(1);
});
