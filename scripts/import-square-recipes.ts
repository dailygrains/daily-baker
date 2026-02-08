import { PrismaClient } from '../src/generated/prisma';
import * as fs from 'fs';
import * as path from 'path';

const prisma = new PrismaClient();

// Ingredient name mapping (CSV variant → DB name)
const ingredientMap: Record<string, string> = {
  // Flours - wheat berries are milled in-house
  'turkey red flour': 'Turkey Red wheat berries',
  'whole-grain turkey red wheat flour': 'Turkey Red wheat berries',
  'organic turkey red flour': 'Turkey Red wheat berries',
  'white sonora flour': 'White Sonora wheat berries',
  'white sonora 100% whole-wheat flour': 'White Sonora wheat berries',
  'whole-grain white sonora wheat flour': 'White Sonora wheat berries',
  'organic white sonora 100% whole-wheat flour': 'White Sonora wheat berries',
  'rouge de bordeaux flour': 'Rouge de Bordeaux wheat berries',
  'whole-grain rouge de bordeaux wheat flour': 'Rouge de Bordeaux wheat berries',
  'whole-grain einkorn flour': 'Einkorn berries',
  'whole-grain einkorn wheat flour': 'Einkorn berries',
  'whole-grain (organic) einkorn wheat flour': 'Einkorn berries',
  'whole-grain spelt flour': 'Spelt berries',
  'whole-grain spelt wheat flour': 'Spelt berries',
  'whole-grain (organic) spelt flour': 'Spelt berries',
  '100% organic whole-grain spelt flour': 'Spelt berries',
  'whole-grain kamut flour': 'Kamut berries',
  'whole-grain (organic) kamut wheat flour': 'Kamut berries',
  'whole-grain kernza® wheat flour': 'Kernza grain',
  'whole-grain yecora rojo wheat flour': 'Yecora Rojo wheat berries',
  'whole-grain emmer flour': 'Emmer berries',
  'whole-grain (organic) wheat flour': 'Turkey Red wheat berries', // Default to Turkey Red
  'whole-grain wheat flour blend': 'Heritage Wheat Flour Blend',
  'whole-grain blend of local heirloom wheat flours': 'Heritage Wheat Flour Blend',
  'turkey red/rustic red/white sonora 100% whole-wheat flour blend': 'Heritage Wheat Flour Blend',
  'turkey red/rustic red/white sonora 100% whole wheat flour blend': 'Heritage Wheat Flour Blend',

  // Standard flours
  'bread flour': 'Bread flour',
  'organic bread flour': 'Bread flour',
  'all-purpose flour': 'All-purpose flour',
  'organic all-purpose flour': 'All-purpose flour',
  'whole-grain oat flour': 'Whole grain oat flour',
  'organic 100% whole-grain dark rye flour': 'Dark rye flour',
  'rice flour': 'Rice flour (for prep)',

  // Dairy
  'butter': 'Unsalted butter',
  'organic butter': 'Unsalted butter',
  'unsalted butter': 'Unsalted butter',
  'butter (for searing)': 'Unsalted butter',
  'milk': 'Whole milk',
  'organic milk': 'Whole milk',
  'buttermilk': 'Buttermilk',
  'nonfat dry milk': 'Nonfat dry milk',
  'eggs': 'Eggs',
  'organic eggs': 'Eggs',
  'organic egg': 'Eggs',
  'parmesan cheese': 'Parmesan cheese',
  'extra sharp cheddar': 'Extra sharp cheddar cheese',

  // Sugars
  'sugar': 'Cane sugar',
  'organic sugar': 'Cane sugar',
  'cane sugar': 'Cane sugar',
  'organic cane sugar': 'Cane sugar',
  'brown sugar': 'Dark brown sugar',
  'organic brown sugar': 'Dark brown sugar',
  'dark brown sugar': 'Dark brown sugar',
  'powdered sugar': 'Powdered sugar',
  'honey': 'Honey',
  'organic honey': 'Honey',
  'molasses': 'Molasses',

  // Chocolate
  'chocolate chips': 'Dark chocolate chips (70%)',
  'dark chocolate chips': 'Dark chocolate chips (70%)',
  'bittersweet chocolate chips': 'Dark chocolate chips (70%)',
  'dark chocolate chunks': 'Dark chocolate chunks (70%)',
  'white chocolate chips': 'White chocolate chips',

  // Fats & Oils
  'olive oil': 'Extra virgin olive oil',
  'organic olive oil': 'Extra virgin olive oil',

  // Leavening & Starters
  'sourdough starter': 'Sourdough starter',
  'sourdough culture (organic wheat flour': 'Sourdough starter',
  'sourdough culture (wheat flour': 'Sourdough starter',
  'sourdough culture': 'Sourdough starter',
  'instant yeast': 'Instant yeast',
  'yeast': 'Instant yeast',
  'baking soda': 'Baking soda',
  'baking powder': 'Baking powder',
  'cream of tartar': 'Cream of tartar',

  // Nuts & Seeds
  'pecans': 'Pecans',
  'organic pecans': 'Pecans',
  'pistachios': 'Pistachios',
  'sunflower seeds': 'Sunflower seeds',
  'organic sunflower seeds': 'Sunflower seeds',
  'sesame seeds': 'Sesame seeds',
  'flaxseed': 'Brown flaxseed',
  'organic brown flaxseed': 'Brown flaxseed',
  'poppy seeds': 'Poppy seeds',
  'organic hulled millet': 'Hulled millet',

  // Dried Fruits
  'organic dried apples': 'Dried apples',
  'organic raisins': 'Raisins',
  'organic dried cranberries': 'Dried cranberries',
  'dried cherries': 'Unsulfured dried cherries',
  'organic unsulfured cherries': 'Unsulfured dried cherries',
  'organic dried tart montmorency cherries': 'Unsulfured dried cherries',
  'organic unsulfured apricots': 'Unsulfured dried apricots',

  // Grains & Flakes
  'thick rolled oats': 'Thick rolled oats',
  'thick-rolled oats': 'Thick rolled oats',
  'organic thick-rolled oats': 'Thick rolled oats',
  'organic whole oat groats': 'Whole oat groats',
  'organic rye flakes': 'Rye flakes',
  'organic wheat flakes': 'Wheat flakes',

  // Spices
  'salt': 'Sea salt',
  'sea salt': 'Sea salt',
  'cinnamon': 'Cinnamon',
  'organic cinnamon': 'Cinnamon',
  'nutmeg': 'Nutmeg',
  'organic nutmeg': 'Nutmeg',
  'cardamom': 'Cardamom',
  'organic cardamom': 'Cardamom',
  'ginger': 'Ground ginger',
  'organic ginger': 'Ground ginger',
  'allspice': 'Allspice',
  'organic allspice': 'Allspice',
  'cloves': 'Ground cloves',
  'vanilla': 'Vanilla extract',
  'organic vanilla': 'Vanilla extract',
  'organic vanilla extract': 'Vanilla extract',
  'organic ground turmeric': 'Ground turmeric',
  'freshly cracked black peppercorns': 'Black peppercorns',

  // Herbs
  'organic fresh rosemary': 'Fresh rosemary',
  'organic sage': 'Sage',
  'basil': 'Dried basil',
  'oregano': 'Dried oregano',
  'red pepper flakes': 'Red pepper flakes',
  'garlic powder': 'Garlic powder',
  'onion powder': 'Onion powder',

  // Citrus
  'organic lemon zest': 'Lemon zest',
  'lemon zest': 'Lemon zest',
  'organic lemon juice': 'Lemon juice',
  'orange zest': 'Orange zest',

  // Other
  'water': 'Filtered water',
  'cocoa powder': 'Cocoa powder',
  'organic cocoa powder': 'Cocoa powder',
  'tea from dried whole butterfly pea flowers': 'Dried butterfly pea flowers',
};

// Clean ingredient string from CSV
function cleanIngredient(ing: string): string {
  return ing
    .toLowerCase()
    .replace(/\. trace amounts.*$/i, '')
    .replace(/trace amounts.*$/i, '')
    .replace(/\(trace amount.*$/i, '')
    .replace(/water\)$/i, '')
    .replace(/onion powder\)$/i, 'onion powder')
    .replace(/^\s+|\s+$/g, '')
    .replace(/\s+/g, ' ');
}

// Parse ingredients from description
function parseIngredients(description: string): string[] {
  // Remove parenthetical content that's not part of ingredient names
  let cleaned = description
    .replace(/\(for searing\)/gi, '(for searing)')
    .replace(/sourdough culture \([^)]+\)/gi, 'sourdough culture')
    .replace(/dried herb blend \([^)]+\)/gi, 'dried herb blend');

  // Split by comma
  const parts = cleaned.split(',').map(p => cleanIngredient(p)).filter(p => p.length > 0);

  // Filter out notes and trace amount mentions
  return parts.filter(p =>
    !p.includes('trace amount') &&
    !p.startsWith('water)') &&
    p.length > 1
  );
}

// Get mapped ingredient name
function getMappedIngredient(csvName: string): string | null {
  const cleaned = cleanIngredient(csvName);

  // Direct lookup
  if (ingredientMap[cleaned]) {
    return ingredientMap[cleaned];
  }

  // Try without "organic" prefix
  const withoutOrganic = cleaned.replace(/^organic\s+/, '');
  if (ingredientMap[withoutOrganic]) {
    return ingredientMap[withoutOrganic];
  }

  // Handle dried herb blend specially
  if (cleaned.includes('dried herb blend')) {
    return null; // Will be handled as multiple ingredients
  }

  return null;
}

async function main() {
  console.log('🍞 Importing Square recipes...\n');

  // Get bakery
  const bakery = await prisma.bakery.findFirst({
    where: { slug: 'daily-grains' }
  });

  if (!bakery) {
    console.error('❌ Daily Grains bakery not found!');
    process.exit(1);
  }

  // Get all existing ingredients
  const existingIngredients = await prisma.ingredient.findMany({
    where: { bakeryId: bakery.id },
    select: { id: true, name: true, unit: true }
  });

  const ingredientByName = new Map(existingIngredients.map(i => [i.name.toLowerCase(), i]));

  console.log(`Found ${existingIngredients.length} existing ingredients\n`);

  // Create Heritage Wheat Flour Blend if it doesn't exist
  if (!ingredientByName.has('heritage wheat flour blend')) {
    const blend = await prisma.ingredient.create({
      data: {
        bakeryId: bakery.id,
        name: 'Heritage Wheat Flour Blend',
        unit: 'lb',
      }
    });
    ingredientByName.set('heritage wheat flour blend', blend);
    console.log('✅ Created "Heritage Wheat Flour Blend" ingredient\n');
  }

  // Read CSV
  const csvPath = path.join(process.cwd(), 'square_ingredients.csv');
  const csvContent = fs.readFileSync(csvPath, 'utf-8');
  // Handle Windows line endings
  const lines = csvContent.replace(/\r\n/g, '\n').split('\n').slice(1).filter(l => l.trim());

  // Track unmapped ingredients
  const unmapped = new Set<string>();
  let recipesCreated = 0;
  let recipesSkipped = 0;

  for (const line of lines) {
    // Parse CSV line (handle quoted and unquoted fields)
    let title: string;
    let description: string;

    const quotedMatch = line.match(/^([^,]+),"(.+)"$/);
    const unquotedMatch = line.match(/^([^,]+),(.+)$/);

    if (quotedMatch) {
      [, title, description] = quotedMatch;
    } else if (unquotedMatch) {
      [, title, description] = unquotedMatch;
    } else {
      console.log(`⚠️  Could not parse line: ${line.substring(0, 50)}...`);
      continue;
    }

    // Check if recipe already exists
    const existing = await prisma.recipe.findFirst({
      where: { bakeryId: bakery.id, name: title }
    });

    if (existing) {
      console.log(`⏭️  Skipping "${title}" (already exists)`);
      recipesSkipped++;
      continue;
    }

    // Parse ingredients
    const csvIngredients = parseIngredients(description);
    const recipeIngredients: Array<{ ingredientId: string; name: string }> = [];

    for (const csvIng of csvIngredients) {
      const mappedName = getMappedIngredient(csvIng);

      if (mappedName) {
        const dbIng = ingredientByName.get(mappedName.toLowerCase());
        if (dbIng) {
          recipeIngredients.push({ ingredientId: dbIng.id, name: dbIng.name });
        } else {
          unmapped.add(`${csvIng} -> ${mappedName} (NOT IN DB)`);
        }
      } else {
        // Skip certain things we know aren't ingredients
        if (csvIng.includes('dried herb blend')) {
          // Add individual herbs
          const herbs = ['Dried basil', 'Dried oregano', 'Red pepper flakes', 'Garlic powder', 'Onion powder'];
          for (const herb of herbs) {
            const dbIng = ingredientByName.get(herb.toLowerCase());
            if (dbIng) {
              recipeIngredients.push({ ingredientId: dbIng.id, name: dbIng.name });
            }
          }
        } else {
          unmapped.add(csvIng);
        }
      }
    }

    // Determine yield based on recipe type
    let yieldQty = 1;
    let yieldUnit = 'batch';

    if (title.toLowerCase().includes('cookie')) {
      yieldQty = 24;
      yieldUnit = 'cookies';
    } else if (title.toLowerCase().includes('bread') || title.toLowerCase().includes('sourdough')) {
      yieldQty = 2;
      yieldUnit = 'loaves';
    } else if (title.toLowerCase().includes('muffin')) {
      yieldQty = 12;
      yieldUnit = 'muffins';
    } else if (title.toLowerCase().includes('roll')) {
      yieldQty = 12;
      yieldUnit = 'rolls';
    } else if (title.toLowerCase().includes('babka')) {
      yieldQty = 2;
      yieldUnit = 'loaves';
    } else if (title.toLowerCase().includes('baguette')) {
      yieldQty = 4;
      yieldUnit = 'baguettes';
    } else if (title.toLowerCase().includes('pancake mix')) {
      yieldQty = 1;
      yieldUnit = 'batch (makes ~12 pancakes)';
    }

    // Create recipe
    const recipe = await prisma.recipe.create({
      data: {
        bakeryId: bakery.id,
        name: title,
        description: `Ingredients: ${description}`,
        yieldQty,
        yieldUnit,
        totalCost: 0,
      }
    });

    // Create section with ingredients
    // Remove duplicates
    const uniqueIngredients = Array.from(
      new Map(recipeIngredients.map(i => [i.ingredientId, i])).values()
    );

    await prisma.recipeSection.create({
      data: {
        recipeId: recipe.id,
        name: 'Ingredients',
        order: 0,
        instructions: `# ${title}\n\n*Recipe instructions to be added.*`,
        ingredients: {
          create: uniqueIngredients.map((ing, idx) => {
            const dbIng = ingredientByName.get(ing.name.toLowerCase());
            return {
              ingredientId: ing.ingredientId,
              quantity: 0, // Placeholder - quantities not in CSV
              unit: dbIng?.unit || 'g',
            };
          })
        }
      }
    });

    console.log(`✅ Created "${title}" with ${uniqueIngredients.length} ingredients`);
    recipesCreated++;
  }

  console.log(`\n========================================`);
  console.log(`📊 Summary:`);
  console.log(`   Recipes created: ${recipesCreated}`);
  console.log(`   Recipes skipped: ${recipesSkipped}`);

  if (unmapped.size > 0) {
    console.log(`\n⚠️  Unmapped ingredients (${unmapped.size}):`);
    for (const u of Array.from(unmapped).sort()) {
      console.log(`   - ${u}`);
    }
  }

  console.log('\n✅ Done!');
}

main()
  .catch(e => {
    console.error('❌ Error:', e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
