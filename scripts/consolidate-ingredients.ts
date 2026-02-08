#!/usr/bin/env npx tsx

/**
 * Ingredient Consolidation Script
 *
 * Consolidates ingredients according to the plan:
 * - Delete malformed/garbage entries
 * - Rename heritage grains from "Flour" to "Berries"
 * - Consolidate duplicates (update recipe references, then delete old)
 * - Rename to sentence case and remove "Organic" prefix
 * - Create new ingredients as needed
 *
 * Usage:
 *   npx tsx scripts/consolidate-ingredients.ts --dry-run
 *   npx tsx scripts/consolidate-ingredients.ts
 */

import { PrismaClient, Prisma } from '../src/generated/prisma';
import dotenv from 'dotenv';

dotenv.config();

const prisma = new PrismaClient();

interface ConsolidationStats {
  deleted: string[];
  renamed: string[];
  consolidated: string[];
  created: string[];
  errors: string[];
}

// ============================================================================
// CONSOLIDATION MAPPINGS
// ============================================================================

// 1. Garbage entries to delete (no consolidation needed - only if unused)
const GARBAGE_ENTRIES: string[] = [
  // All former garbage entries are now consolidated instead
];

// 2. Ingredients to rename (simple rename, no consolidation)
const RENAMES: Record<string, string> = {
  // Heritage grains: Flour -> Berries
  'White Sonora Whole Wheat Flour': 'White Sonora wheat berries',
  'Turkey Red Whole Wheat Flour': 'Turkey Red wheat berries',
  'Rouge de Bordeaux Whole Wheat Flour': 'Rouge de Bordeaux wheat berries',
  'Yecora Rojo Whole Wheat Flour': 'Yecora Rojo wheat berries',
  'Einkorn Whole Grain Flour': 'Einkorn berries',
  'Emmer Whole Grain Flour': 'Emmer berries',
  'Organic Spelt Whole Grain Flour': 'Spelt berries',
  'Organic Kamut Whole Grain Flour': 'Kamut berries',
  'Kernza Whole Grain Flour': 'Kernza grain',

  // Starter rename
  'Sourdough Culture (Starter)': 'Sourdough starter',

  // Sentence case and remove "Organic" - Flours
  'Organic Bread Flour': 'Bread flour',
  'Organic All-Purpose Flour': 'All-purpose flour',
  'Organic Dark Rye Flour': 'Dark rye flour',
  'Whole Grain Oat Flour': 'Whole grain oat flour',
  'Rice Flour (for prep)': 'Rice flour (for prep)',

  // Grains
  'Thick Rolled Oats': 'Thick rolled oats',
  'Organic Whole Oat Groats': 'Whole oat groats',
  'Organic Rye Flakes': 'Rye flakes',
  'Organic Wheat Flakes': 'Wheat flakes',

  // Dairy
  'Organic Unsalted Butter': 'Unsalted butter',
  'Organic Eggs': 'Eggs',
  'Organic Whole Milk': 'Whole milk',
  'Nonfat Dry Milk': 'Nonfat dry milk',
  'Parmesan Cheese': 'Parmesan cheese',
  'Extra Sharp Cheddar Cheese': 'Extra sharp cheddar cheese',

  // Sugars
  'Organic Cane Sugar': 'Cane sugar',
  'Organic Brown Sugar': 'Dark brown sugar',
  'Powdered Sugar': 'Powdered sugar',
  'Organic Honey': 'Honey',

  // Chocolate
  'Bittersweet Dark Chocolate Chips': 'Dark chocolate chips (70%)',
  'Milk Chocolate Chips': 'Milk chocolate chips (38%)',
  'White Chocolate Chips': 'White chocolate chips',
  'Dark Chocolate Chunks': 'Dark chocolate chunks (70%)',
  'Organic Cocoa Powder': 'Cocoa powder',

  // Nuts & Seeds
  'Organic Pecans': 'Pecans',
  'Organic Sunflower Seeds': 'Sunflower seeds',
  'Sesame Seeds': 'Sesame seeds',
  'Organic Brown Flaxseed': 'Brown flaxseed',
  'Poppy Seeds': 'Poppy seeds',
  'Organic Hulled Millet': 'Hulled millet',

  // Dried Fruits
  'Organic Dried Apples': 'Dried apples',
  'Organic Unsulfured Dried Apricots': 'Unsulfured dried apricots',
  'Organic Unsulfured Dried Cherries': 'Unsulfured dried cherries',
  'Organic Raisins': 'Raisins',
  'Organic Dried Cranberries': 'Dried cranberries',

  // Spices
  'Sea Salt': 'Sea salt',
  'Pink Sea Salt': 'Pink sea salt',
  'Organic Cinnamon': 'Cinnamon',
  'Organic Nutmeg': 'Nutmeg',
  'Organic Cardamom': 'Cardamom',
  'Organic Ground Ginger': 'Ground ginger',
  'Organic Allspice': 'Allspice',
  'Organic Vanilla Extract': 'Vanilla extract',
  'Ground Cloves': 'Ground cloves',
  'Black Peppercorns': 'Black peppercorns',
  'Organic Ground Turmeric': 'Ground turmeric',
  'Cream of Tartar': 'Cream of tartar',

  // Herbs
  'Organic Fresh Rosemary': 'Fresh rosemary',
  'Organic Sage': 'Sage',
  'Dried Basil': 'Dried basil',
  'Dried Oregano': 'Dried oregano',
  'Red Pepper Flakes': 'Red pepper flakes',
  'Garlic Powder': 'Garlic powder',
  'Onion Powder': 'Onion powder',

  // Other
  'Organic Extra Virgin Olive Oil': 'Extra virgin olive oil',
  'Instant Yeast': 'Instant yeast',
  'Baking Soda': 'Baking soda',
  'Baking Powder': 'Baking powder',
  'Organic Lemon Zest': 'Lemon zest',
  'Organic Lemon Juice': 'Lemon juice',
  'Orange Zest': 'Orange zest',
  'Dried Butterfly Pea Flowers': 'Dried butterfly pea flowers',
  'Filtered Water': 'Filtered water',
};

// 3. Consolidations: Map old name -> target name
// The old ingredient will be deleted after updating recipe references
const CONSOLIDATIONS: Record<string, string> = {
  // Water variants -> Filtered water
  'water *': 'Filtered water',
  'water 1': 'Filtered water',
  'water 2': 'Filtered water',
  'water divided': 'Filtered water',
  'water for autolyse': 'Filtered water',
  'water for soaking seeds, do not drain - I did 50g when adding to dough': 'Filtered water',
  'water*': 'Filtered water',
  'boiling water': 'Filtered water',
  'hot water, approx 180°F': 'Filtered water',
  'pure water': 'Filtered water',

  // Chocolate consolidations
  'bittersweet chocolate chips': 'Dark chocolate chips (70%)',
  'dark or semisweet chocolate chips': 'Dark chocolate chips (70%)',
  'semi-sweet chocolate chips/chunks, in this version I used 125g': 'Dark chocolate chips (70%)',
  'semi-sweet chocolate chips/chunks, in this version, I used 170g': 'Dark chocolate chips (70%)',
  'chocolate chips or 1 ½ cups chocolate chunks': 'Dark chocolate chips (70%)',

  // Eggs consolidation
  'egg at toom temperature': 'Eggs',
  'egg yolk': 'Eggs',
  'large eggs': 'Eggs',
  'yolk at room temperature': 'Eggs',

  // Butter consolidation
  'softened unsalted butter': 'Unsalted butter',

  // Sugar consolidations
  'dark brown or Golden C sugar': 'Dark brown sugar',
  'dark or Golden C brown sugar': 'Dark brown sugar',
  'packed dark brown sugar': 'Dark brown sugar',
  'granulated sugar': 'Cane sugar',
  'white sugar': 'Cane sugar',

  // Flour duplicates
  'bread flour - I did 40% Rouge': 'Bread flour',
  'white flour': 'All-purpose flour',
  'hard red spring wheat flour': 'Hard red spring wheat berries',
  'hard white spring whole grain flour': 'Hard white spring wheat berries',
  'hard white whole grain flour': 'Hard white spring wheat berries',
  'oat flour or homemilled oat groats': 'Whole grain oat flour',

  // Heritage grain duplicates
  'home-milled einkorn flour': 'Einkorn berries',
  'home-milled kamut flour': 'Kamut berries',
  'homemilled einkorn wheat berries or whole grain einkorn flour': 'Einkorn berries',
  'home-milled whole grain einkorn wheat berries or whole grain einkorn flour or': 'Einkorn berries',
  'spelt whole grain flour or home-milled sprouted spelt berries': 'Spelt berries',
  'whole grain spelt flour or home-milled spelt berries': 'Spelt berries',
  'whole grain Kamut': 'Kamut berries',
  'whole grain rye flour': 'Dark rye flour',
  'home-milled Kernza': 'Kernza grain',
  'red fife whole grain flour': 'Red Fife wheat berries',
  'bolles wheat flour or homemilled bolles hard red spring wheat': 'Bolles wheat berries',
  'bono rye whole grain flour': 'Bono rye berries',
  'White Sonora or HWW': 'White Sonora wheat berries',
  'Yecora Rojo whole grain flour or hard white spring wheat whole grain flour': 'Yecora Rojo wheat berries',

  // Starter consolidations
  'active sourdough starter': 'Sourdough starter',
  'cold/dormant sourdough starter': 'Sourdough starter',
  'ripe sourdough starter, 100% hydration': 'Sourdough starter',

  // Specialty items
  'any 12oz bottle of beer. I used a Milk Stout brewed by Left Hand Brewing company': 'Beer',
  'dried cherries, in this version I used Bing cherries': 'Unsulfured dried cherries',
  'dried cherries, in this version I used Montmorency': 'Unsulfured dried cherries',
  'dried whole butterfly pea flowers, for the tea': 'Dried butterfly pea flowers',
  'blue tea': 'Dried butterfly pea flowers',
  'crushed dried rosemary to be added during the pre-shape': 'Dried rosemary',

  // Other consolidations
  'flaxmeal **': 'Brown flaxseed',
  'kosher salt': 'Sea salt',
  'pecan pieces': 'Pecans',
  'pistachio pieces': 'Pistachios',
  'thick-rolled oats': 'Thick rolled oats',
  'ground cinnamon': 'Cinnamon',

  // Former "garbage" entries - now consolidating to proper ingredients
  '% Kamut Whole Grain': 'Kamut berries',
  '1 1/)': 'Eggs', // Malformed egg entry
  'T/1 stick/115 g unsalted butter at room temperature': 'Unsalted butter',
  'c. dried cherries': 'Unsulfured dried cherries',
  't. vanilla extract': 'Vanilla extract',
  'of Red Fife/White Sonoran/Hard Red Spring Wheat 1:1:1 blend': 'Red Fife wheat berries',
  'grams water': 'Filtered water',
  'home-milled flour': 'Bread flour', // Generic flour -> bread flour
  'Turkey Red/White Sonora/Yecora Rojo 1:1:1 blend': 'Turkey Red wheat berries',
  'soft wheat': 'All-purpose flour', // Soft wheat -> AP flour

  // Additional consolidations from recipe imports
  'Spelt Flour': 'Spelt berries',
  'spelt whole grain flour': 'Spelt berries',
  'apple pie spice': 'Apple pie spice',
  'chia seeds': 'Chia seeds',
  'corn flour fresh-milled yellow dent corn, niles red flint corn, or bloody butcher corn': 'Corn flour',
  'desem': 'Desem',
  'durum high extraction flour': 'Durum flour',
  'fresh thyme, minced': 'Fresh thyme',
  'large egg': 'Eggs',
  'large eggs': 'Eggs',
  'salt water': 'Filtered water',
  'sorghum flour': 'Sorghum flour',
  'toasted walnut pieces': 'Walnuts',
  'ube or purple sweet potato, cooked and peeled': 'Ube',
  'vegetable oil': 'Vegetable oil',
  'whole wheat flour': 'Bread flour', // Generic whole wheat -> bread flour
  'maple syrup': 'Maple syrup',
  'yeast water': 'Yeast water',
};

// 4. New ingredients to create (if they don't exist)
const NEW_INGREDIENTS: Array<{ name: string; unit: string }> = [
  // Chocolate percentages
  { name: 'Dark chocolate chips (55%)', unit: 'lb' },
  { name: 'Dark chocolate chips (85%)', unit: 'lb' },

  // New ingredients from plan
  { name: 'Apple pie spice', unit: 'oz' },
  { name: 'Barley malt syrup', unit: 'oz' },
  { name: 'Beer', unit: 'oz' },
  { name: 'Chia seeds', unit: 'lb' },
  { name: 'Corn flour', unit: 'lb' },
  { name: 'Dried rosemary', unit: 'oz' },
  { name: 'Durum flour', unit: 'lb' },
  { name: 'Fresh thyme', unit: 'oz' },
  { name: 'Maple syrup', unit: 'oz' },
  { name: 'Sorghum flour', unit: 'lb' },
  { name: 'Ube', unit: 'lb' },
  { name: 'Vegetable oil', unit: 'L' },
  { name: 'Vinegar', unit: 'oz' },
  { name: 'Walnuts', unit: 'lb' },
  { name: 'Light brown sugar', unit: 'lb' },

  // Heritage grains from imports
  { name: 'Red Fife wheat berries', unit: 'lb' },
  { name: 'Bolles wheat berries', unit: 'lb' },
  { name: 'Bono rye berries', unit: 'lb' },
  { name: 'Hard red spring wheat berries', unit: 'lb' },
  { name: 'Hard white spring wheat berries', unit: 'lb' },

  // Preferments (keep separate)
  { name: 'Levain', unit: 'lb' },
  { name: 'Desem', unit: 'lb' },
  { name: 'Poolish', unit: 'lb' },
  { name: 'Yeast water', unit: 'oz' },

  // Additional from imports
  { name: 'Salted butter', unit: 'lb' },
];

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

async function getBakeryId(): Promise<string> {
  const bakery = await prisma.bakery.findFirst();
  if (!bakery) {
    throw new Error('No bakery found. Please create a bakery first.');
  }
  return bakery.id;
}

async function findIngredientByName(
  bakeryId: string,
  name: string
): Promise<{ id: string; name: string } | null> {
  return prisma.ingredient.findFirst({
    where: {
      bakeryId,
      name: { equals: name, mode: 'insensitive' },
    },
    select: { id: true, name: true },
  });
}

async function updateRecipeReferences(
  oldIngredientId: string,
  newIngredientId: string
): Promise<number> {
  const result = await prisma.recipeSectionIngredient.updateMany({
    where: { ingredientId: oldIngredientId },
    data: { ingredientId: newIngredientId },
  });
  return result.count;
}

async function deleteIngredient(ingredientId: string): Promise<void> {
  // First delete any vendor associations
  await prisma.ingredientVendor.deleteMany({
    where: { ingredientId },
  });

  // Delete inventory and lots
  const inventory = await prisma.inventory.findUnique({
    where: { ingredientId },
  });
  if (inventory) {
    await prisma.inventoryUsage.deleteMany({
      where: { lot: { inventoryId: inventory.id } },
    });
    await prisma.inventoryLot.deleteMany({
      where: { inventoryId: inventory.id },
    });
    await prisma.inventory.delete({
      where: { id: inventory.id },
    });
  }

  // Finally delete the ingredient
  await prisma.ingredient.delete({
    where: { id: ingredientId },
  });
}

// ============================================================================
// MAIN CONSOLIDATION FUNCTIONS
// ============================================================================

async function deleteGarbageEntries(
  bakeryId: string,
  stats: ConsolidationStats,
  dryRun: boolean
): Promise<void> {
  console.log('\n=== Deleting Garbage Entries ===\n');

  for (const name of GARBAGE_ENTRIES) {
    const ingredient = await findIngredientByName(bakeryId, name);
    if (!ingredient) {
      console.log(`  [SKIP] "${name}" - not found`);
      continue;
    }

    // Check if it's used in any recipes
    const usageCount = await prisma.recipeSectionIngredient.count({
      where: { ingredientId: ingredient.id },
    });

    if (usageCount > 0) {
      console.log(`  [WARN] "${name}" is used in ${usageCount} recipe(s) - skipping`);
      stats.errors.push(`Cannot delete "${name}" - used in ${usageCount} recipe(s)`);
      continue;
    }

    if (dryRun) {
      console.log(`  [DRY RUN] Would delete: "${ingredient.name}"`);
    } else {
      await deleteIngredient(ingredient.id);
      console.log(`  [DELETED] "${ingredient.name}"`);
    }
    stats.deleted.push(ingredient.name);
  }
}

async function renameIngredients(
  bakeryId: string,
  stats: ConsolidationStats,
  dryRun: boolean
): Promise<void> {
  console.log('\n=== Renaming Ingredients ===\n');

  for (const [oldName, newName] of Object.entries(RENAMES)) {
    const ingredient = await findIngredientByName(bakeryId, oldName);
    if (!ingredient) {
      // Maybe already renamed or doesn't exist
      continue;
    }

    // Check if target name already exists
    const existingTarget = await findIngredientByName(bakeryId, newName);
    if (existingTarget && existingTarget.id !== ingredient.id) {
      console.log(`  [SKIP] "${oldName}" -> "${newName}" (target already exists)`);
      continue;
    }

    if (dryRun) {
      console.log(`  [DRY RUN] Would rename: "${ingredient.name}" -> "${newName}"`);
    } else {
      await prisma.ingredient.update({
        where: { id: ingredient.id },
        data: { name: newName },
      });
      console.log(`  [RENAMED] "${ingredient.name}" -> "${newName}"`);
    }
    stats.renamed.push(`${oldName} -> ${newName}`);
  }
}

async function consolidateIngredients(
  bakeryId: string,
  stats: ConsolidationStats,
  dryRun: boolean
): Promise<void> {
  console.log('\n=== Consolidating Ingredients ===\n');

  for (const [oldName, targetName] of Object.entries(CONSOLIDATIONS)) {
    const oldIngredient = await findIngredientByName(bakeryId, oldName);
    if (!oldIngredient) {
      // Source ingredient doesn't exist, skip
      continue;
    }

    let targetIngredient = await findIngredientByName(bakeryId, targetName);

    // If source and target are the same ingredient (case-insensitive match), skip
    if (targetIngredient && targetIngredient.id === oldIngredient.id) {
      // Just rename it to the proper case if needed
      if (oldIngredient.name !== targetName) {
        if (dryRun) {
          console.log(`  [DRY RUN] Would rename: "${oldIngredient.name}" -> "${targetName}"`);
        } else {
          await prisma.ingredient.update({
            where: { id: oldIngredient.id },
            data: { name: targetName },
          });
          console.log(`  [RENAMED] "${oldIngredient.name}" -> "${targetName}"`);
        }
        stats.renamed.push(`${oldName} -> ${targetName}`);
      }
      continue;
    }

    if (!targetIngredient) {
      // Target doesn't exist, check if we should create it
      // First check if it's a renamed version of something
      const renamedFrom = Object.entries(RENAMES).find(([, v]) => v === targetName);
      if (renamedFrom) {
        targetIngredient = await findIngredientByName(bakeryId, renamedFrom[0]);
      }

      if (!targetIngredient) {
        // Need to create the target
        const newIngDef = NEW_INGREDIENTS.find((i) => i.name === targetName);
        const unit = newIngDef?.unit || oldIngredient ? 'g' : 'each';

        if (dryRun) {
          console.log(`  [DRY RUN] Would create target: "${targetName}"`);
          console.log(`  [DRY RUN] Would consolidate: "${oldName}" -> "${targetName}"`);
          stats.created.push(targetName);
          stats.consolidated.push(`${oldName} -> ${targetName}`);
          continue;
        }

        const created = await prisma.ingredient.create({
          data: { bakeryId, name: targetName, unit },
        });
        targetIngredient = { id: created.id, name: created.name };
        console.log(`  [CREATED] Target ingredient: "${targetName}"`);
        stats.created.push(targetName);
      }
    }

    if (!targetIngredient) {
      stats.errors.push(`Could not find or create target "${targetName}" for "${oldName}"`);
      continue;
    }

    // Update recipe references
    const refsBefore = await prisma.recipeSectionIngredient.count({
      where: { ingredientId: oldIngredient.id },
    });

    if (dryRun) {
      console.log(
        `  [DRY RUN] Would consolidate: "${oldIngredient.name}" -> "${targetName}" (${refsBefore} refs)`
      );
      stats.consolidated.push(`${oldName} -> ${targetName}`);
      continue;
    }

    const refsUpdated = await updateRecipeReferences(oldIngredient.id, targetIngredient.id);

    // Verify all refs were updated
    const refsRemaining = await prisma.recipeSectionIngredient.count({
      where: { ingredientId: oldIngredient.id },
    });

    if (refsRemaining > 0) {
      console.log(
        `  [WARN] "${oldIngredient.name}" still has ${refsRemaining} refs after update - skipping delete`
      );
      stats.errors.push(`Could not fully consolidate "${oldName}" - ${refsRemaining} refs remaining`);
      continue;
    }

    // Delete the old ingredient
    try {
      await deleteIngredient(oldIngredient.id);
      console.log(
        `  [CONSOLIDATED] "${oldIngredient.name}" -> "${targetName}" (${refsUpdated} refs updated)`
      );
      stats.consolidated.push(`${oldName} -> ${targetName}`);
    } catch (error) {
      console.log(`  [ERROR] Failed to delete "${oldIngredient.name}": ${error}`);
      stats.errors.push(`Failed to delete "${oldName}"`);
    }
  }
}

async function createNewIngredients(
  bakeryId: string,
  stats: ConsolidationStats,
  dryRun: boolean
): Promise<void> {
  console.log('\n=== Creating New Ingredients ===\n');

  for (const { name, unit } of NEW_INGREDIENTS) {
    const existing = await findIngredientByName(bakeryId, name);
    if (existing) {
      console.log(`  [SKIP] "${name}" - already exists`);
      continue;
    }

    if (dryRun) {
      console.log(`  [DRY RUN] Would create: "${name}" (${unit})`);
    } else {
      await prisma.ingredient.create({
        data: { bakeryId, name, unit },
      });
      console.log(`  [CREATED] "${name}" (${unit})`);
    }
    stats.created.push(name);
  }
}

// ============================================================================
// MAIN
// ============================================================================

async function main() {
  const args = process.argv.slice(2);
  const dryRun = args.includes('--dry-run');

  console.log('='.repeat(60));
  console.log('Ingredient Consolidation Script');
  console.log('='.repeat(60));

  if (dryRun) {
    console.log('\n*** DRY RUN MODE - No changes will be made ***');
  }

  const bakeryId = await getBakeryId();
  console.log(`\nBakery ID: ${bakeryId}`);

  // Get current ingredient count
  const beforeCount = await prisma.ingredient.count({ where: { bakeryId } });
  console.log(`Current ingredient count: ${beforeCount}`);

  const stats: ConsolidationStats = {
    deleted: [],
    renamed: [],
    consolidated: [],
    created: [],
    errors: [],
  };

  // Execute consolidation steps in order
  await deleteGarbageEntries(bakeryId, stats, dryRun);
  await renameIngredients(bakeryId, stats, dryRun);
  await consolidateIngredients(bakeryId, stats, dryRun);
  await createNewIngredients(bakeryId, stats, dryRun);

  // Get final count
  const afterCount = await prisma.ingredient.count({ where: { bakeryId } });

  // Print summary
  console.log('\n' + '='.repeat(60));
  console.log('Summary');
  console.log('='.repeat(60));
  console.log(`Ingredients deleted: ${stats.deleted.length}`);
  console.log(`Ingredients renamed: ${stats.renamed.length}`);
  console.log(`Ingredients consolidated: ${stats.consolidated.length}`);
  console.log(`Ingredients created: ${stats.created.length}`);
  console.log(`Errors: ${stats.errors.length}`);
  console.log(`\nBefore: ${beforeCount} ingredients`);
  console.log(`After: ${dryRun ? '(dry run)' : afterCount} ingredients`);

  if (stats.errors.length > 0) {
    console.log('\nErrors:');
    for (const error of stats.errors) {
      console.log(`  - ${error}`);
    }
  }

  await prisma.$disconnect();
}

main().catch((error) => {
  console.error('Fatal error:', error);
  prisma.$disconnect();
  process.exit(1);
});
