/**
 * Add Inventory records and initial lots for ingredients that don't have any.
 * Prices based on wholesale bakery supplier research (WebstaurantStore, Bakers Authority, etc.)
 *
 * Usage:
 *   npx tsx scripts/add-inventory-lots.ts
 *   npx tsx scripts/add-inventory-lots.ts --dry-run
 */
import { PrismaClient } from '../src/generated/prisma';

const prisma = new PrismaClient();
const DRY_RUN = process.argv.includes('--dry-run');

// Vendor names for lookup
const VENDOR_NAMES = {
  flourMill: 'Camas Country Mill',
  centralMilling: 'Central Milling Company',
  dryGoods: 'Azure Standard',
  dairy: 'Organic Valley',
  chocolate: 'Guittard Chocolate',
} as const;

// Lot definitions keyed by ingredient name
// { purchaseQty, purchaseUnit, costPerUnit, vendorKey, notes?, expiresAt? }
interface LotDef {
  purchaseQty: number;
  purchaseUnit: string;
  costPerUnit: number;
  vendorKey: keyof typeof VENDOR_NAMES | null;
  notes?: string;
  expiresInDays?: number; // days from purchase date to expiry
}

const INGREDIENT_LOTS: Record<string, LotDef> = {
  // ============================================================
  // FLOURS & GRAINS
  // ============================================================
  'All-purpose flour': {
    purchaseQty: 50, purchaseUnit: 'lb', costPerUnit: 0.58,
    vendorKey: 'centralMilling', notes: '50 lb bag - ADM All-Purpose',
  },
  'Dark rye flour': {
    purchaseQty: 40, purchaseUnit: 'lb', costPerUnit: 0.93,
    vendorKey: 'flourMill', notes: '40 lb bag - Ardent Mills',
  },
  'Whole grain oat flour': {
    purchaseQty: 50, purchaseUnit: 'lb', costPerUnit: 0.79,
    vendorKey: 'dryGoods', notes: '50 lb bag - Grain Millers',
  },
  'Rice flour (for prep)': {
    purchaseQty: 50, purchaseUnit: 'lb', costPerUnit: 0.95,
    vendorKey: 'centralMilling', notes: '50 lb bag - Gold Medal white rice flour',
  },
  'Emmer berries': {
    purchaseQty: 48, purchaseUnit: 'lb', costPerUnit: 2.54,
    vendorKey: 'flourMill', notes: '48 lb bag - heritage grain',
  },
  'Spelt berries': {
    purchaseQty: 48, purchaseUnit: 'lb', costPerUnit: 2.02,
    vendorKey: 'flourMill', notes: '48 lb bag - organic',
  },
  'Kamut berries': {
    purchaseQty: 50, purchaseUnit: 'lb', costPerUnit: 1.30,
    vendorKey: 'flourMill', notes: '50 lb bag - Khorasan wheat',
  },
  'Kernza grain': {
    purchaseQty: 10, purchaseUnit: 'lb', costPerUnit: 5.00,
    vendorKey: 'flourMill', notes: '10 lb bag - perennial grain, limited supply',
  },
  'Yecora Rojo wheat berries': {
    purchaseQty: 48, purchaseUnit: 'lb', costPerUnit: 1.60,
    vendorKey: 'flourMill', notes: '48 lb bag - heritage hard red spring wheat',
  },

  // ============================================================
  // SEEDS & FLAKES
  // ============================================================
  'Brown flaxseed': {
    purchaseQty: 25, purchaseUnit: 'lb', costPerUnit: 1.73,
    vendorKey: 'dryGoods', notes: '25 lb bag',
  },
  'Hulled millet': {
    purchaseQty: 50, purchaseUnit: 'lb', costPerUnit: 1.57,
    vendorKey: 'dryGoods', notes: '50 lb bag',
  },
  'Poppy seeds': {
    purchaseQty: 25, purchaseUnit: 'lb', costPerUnit: 2.87,
    vendorKey: 'dryGoods', notes: '25 lb bag - blue/Dutch',
  },
  'Sesame seeds': {
    purchaseQty: 25, purchaseUnit: 'lb', costPerUnit: 2.87,
    vendorKey: 'dryGoods', notes: '25 lb bag - hulled white',
  },
  'Sunflower seeds': {
    purchaseQty: 25, purchaseUnit: 'lb', costPerUnit: 2.45,
    vendorKey: 'dryGoods', notes: '25 lb bag - hulled raw',
  },
  'Rye flakes': {
    purchaseQty: 25, purchaseUnit: 'lb', costPerUnit: 3.26,
    vendorKey: 'dryGoods', notes: '25 lb bag - rolled rye',
  },
  'Wheat flakes': {
    purchaseQty: 25, purchaseUnit: 'lb', costPerUnit: 0.63,
    vendorKey: 'dryGoods', notes: '25 lb bag - rolled wheat',
  },
  'Whole oat groats': {
    purchaseQty: 50, purchaseUnit: 'lb', costPerUnit: 0.79,
    vendorKey: 'dryGoods', notes: '50 lb bag',
  },

  // ============================================================
  // DAIRY
  // ============================================================
  'Buttermilk': {
    purchaseQty: 8, purchaseUnit: 'qt', costPerUnit: 2.25,
    vendorKey: 'dairy', notes: 'Case of half-gallons', expiresInDays: 21,
  },
  'Nonfat dry milk': {
    purchaseQty: 25, purchaseUnit: 'lb', costPerUnit: 3.19,
    vendorKey: 'dairy', notes: '25 lb bag - Land O\'Lakes',
  },
  'Salted butter': {
    purchaseQty: 36, purchaseUnit: 'lb', costPerUnit: 3.61,
    vendorKey: 'dairy', notes: '36 lb case (36x1lb)', expiresInDays: 120,
  },
  'Extra sharp cheddar cheese': {
    purchaseQty: 10, purchaseUnit: 'lb', costPerUnit: 12.30,
    vendorKey: 'dairy', notes: '10 lb case (2x5lb blocks)', expiresInDays: 90,
  },
  'Parmesan cheese': {
    purchaseQty: 5, purchaseUnit: 'lb', costPerUnit: 8.25,
    vendorKey: 'dairy', notes: '5 lb block - Stella domestic', expiresInDays: 180,
  },

  // ============================================================
  // CHOCOLATE
  // ============================================================
  'Dark chocolate chips (55%)': {
    purchaseQty: 25, purchaseUnit: 'lb', costPerUnit: 9.50,
    vendorKey: 'chocolate', notes: '25 lb case - Guittard 55% bittersweet',
  },
  'Dark chocolate chips (85%)': {
    purchaseQty: 10, purchaseUnit: 'lb', costPerUnit: 15.00,
    vendorKey: 'chocolate', notes: '10 lb case - 85% extra dark',
  },
  'Dark chocolate chunks (70%)': {
    purchaseQty: 22, purchaseUnit: 'lb', costPerUnit: 10.91,
    vendorKey: 'chocolate', notes: '22 lb case - Callebaut 70% dark callets',
  },
  'Milk chocolate chips (38%)': {
    purchaseQty: 25, purchaseUnit: 'lb', costPerUnit: 8.68,
    vendorKey: 'chocolate', notes: '25 lb case - Guittard milk chocolate',
  },
  'White chocolate chips': {
    purchaseQty: 25, purchaseUnit: 'lb', costPerUnit: 7.56,
    vendorKey: 'chocolate', notes: '25 lb case - Guittard white chocolate',
  },
  'Cocoa powder': {
    purchaseQty: 25, purchaseUnit: 'lb', costPerUnit: 7.70,
    vendorKey: 'chocolate', notes: '25 lb bag - natural cocoa powder',
  },

  // ============================================================
  // NUTS & DRIED FRUIT
  // ============================================================
  'Pistachios': {
    purchaseQty: 10, purchaseUnit: 'lb', costPerUnit: 18.69,
    vendorKey: 'dryGoods', notes: '10 lb case - raw, shelled',
  },
  'Walnuts': {
    purchaseQty: 25, purchaseUnit: 'lb', costPerUnit: 4.34,
    vendorKey: 'dryGoods', notes: '25 lb case - halves & pieces',
  },
  'Dried apples': {
    purchaseQty: 22, purchaseUnit: 'lb', costPerUnit: 5.88,
    vendorKey: 'dryGoods', notes: '22 lb box - diced',
  },
  'Dried cranberries': {
    purchaseQty: 25, purchaseUnit: 'lb', costPerUnit: 3.20,
    vendorKey: 'dryGoods', notes: '25 lb case - Ocean Spray sweetened',
  },
  'Raisins': {
    purchaseQty: 30, purchaseUnit: 'lb', costPerUnit: 2.33,
    vendorKey: 'dryGoods', notes: '30 lb case - California Select',
  },

  // ============================================================
  // SWEETENERS
  // ============================================================
  'Honey': {
    purchaseQty: 5, purchaseUnit: 'lb', costPerUnit: 5.42,
    vendorKey: 'dryGoods', notes: '5 lb jug - pure honey',
  },
  'Light brown sugar': {
    purchaseQty: 50, purchaseUnit: 'lb', costPerUnit: 1.26,
    vendorKey: 'dryGoods', notes: '50 lb bag',
  },
  'Powdered sugar': {
    purchaseQty: 50, purchaseUnit: 'lb', costPerUnit: 1.24,
    vendorKey: 'dryGoods', notes: '50 lb bag - Domino 6X',
  },
  'Molasses': {
    purchaseQty: 4, purchaseUnit: 'qt', costPerUnit: 6.66,
    vendorKey: 'dryGoods', notes: '1 gallon jug - light molasses',
  },

  // ============================================================
  // SPICES
  // ============================================================
  'Allspice': {
    purchaseQty: 8, purchaseUnit: 'oz', costPerUnit: 0.75,
    vendorKey: 'dryGoods', notes: '8 oz container - ground',
  },
  'Black peppercorns': {
    purchaseQty: 8, purchaseUnit: 'oz', costPerUnit: 0.74,
    vendorKey: 'dryGoods', notes: '8 oz container - whole',
  },
  'Cardamom': {
    purchaseQty: 16, purchaseUnit: 'oz', costPerUnit: 2.06,
    vendorKey: 'dryGoods', notes: '16 oz container - ground',
  },
  'Ground cloves': {
    purchaseQty: 7, purchaseUnit: 'oz', costPerUnit: 0.98,
    vendorKey: 'dryGoods', notes: '7 oz container',
  },
  'Ground ginger': {
    purchaseQty: 16, purchaseUnit: 'oz', costPerUnit: 0.25,
    vendorKey: 'dryGoods', notes: '1 lb container',
  },
  'Ground turmeric': {
    purchaseQty: 16, purchaseUnit: 'oz', costPerUnit: 0.18,
    vendorKey: 'dryGoods', notes: '1 lb container',
  },
  'Nutmeg': {
    purchaseQty: 8, purchaseUnit: 'oz', costPerUnit: 1.07,
    vendorKey: 'dryGoods', notes: '8 oz container - ground',
  },
  'Red pepper flakes': {
    purchaseQty: 16, purchaseUnit: 'oz', costPerUnit: 0.34,
    vendorKey: 'dryGoods', notes: '1 lb container',
  },
  'Garlic powder': {
    purchaseQty: 16, purchaseUnit: 'oz', costPerUnit: 0.32,
    vendorKey: 'dryGoods', notes: '1 lb container',
  },
  'Onion powder': {
    purchaseQty: 16, purchaseUnit: 'oz', costPerUnit: 0.37,
    vendorKey: 'dryGoods', notes: '1 lb container',
  },
  'Pink sea salt': {
    purchaseQty: 25, purchaseUnit: 'lb', costPerUnit: 1.42,
    vendorKey: 'dryGoods', notes: '25 lb bag - Himalayan fine',
  },

  // ============================================================
  // HERBS
  // ============================================================
  'Dried basil': {
    purchaseQty: 8, purchaseUnit: 'oz', costPerUnit: 0.22,
    vendorKey: 'dryGoods', notes: '8 oz bag',
  },
  'Dried oregano': {
    purchaseQty: 8, purchaseUnit: 'oz', costPerUnit: 0.48,
    vendorKey: 'dryGoods', notes: '8 oz bag',
  },
  'Dried rosemary': {
    purchaseQty: 8, purchaseUnit: 'oz', costPerUnit: 0.26,
    vendorKey: 'dryGoods', notes: '8 oz bag',
  },
  'Fresh rosemary': {
    purchaseQty: 4, purchaseUnit: 'oz', costPerUnit: 0.87,
    vendorKey: 'dairy', notes: 'Fresh herbs - local supplier', expiresInDays: 14,
  },
  'Sage': {
    purchaseQty: 6, purchaseUnit: 'oz', costPerUnit: 0.67,
    vendorKey: 'dryGoods', notes: '6 oz container - ground',
  },

  // ============================================================
  // BAKING ESSENTIALS
  // ============================================================
  'Baking powder': {
    purchaseQty: 5, purchaseUnit: 'lb', costPerUnit: 1.74,
    vendorKey: 'dryGoods', notes: '5 lb container - double acting',
  },
  'Baking soda': {
    purchaseQty: 5, purchaseUnit: 'lb', costPerUnit: 1.38,
    vendorKey: 'dryGoods', notes: '5 lb bag - Arm & Hammer',
  },
  'Cream of tartar': {
    purchaseQty: 16, purchaseUnit: 'oz', costPerUnit: 0.40,
    vendorKey: 'dryGoods', notes: '1 lb container',
  },
  'Vanilla extract': {
    purchaseQty: 16, purchaseUnit: 'oz', costPerUnit: 1.06,
    vendorKey: 'dryGoods', notes: '16 oz bottle - pure vanilla extract',
  },

  // ============================================================
  // MISCELLANEOUS
  // ============================================================
  'Extra virgin olive oil': {
    purchaseQty: 3, purchaseUnit: 'L', costPerUnit: 12.83,
    vendorKey: 'dryGoods', notes: '3 L tin',
  },
  'Lemon juice': {
    purchaseQty: 128, purchaseUnit: 'oz', costPerUnit: 0.11,
    vendorKey: 'dryGoods', notes: '1 gallon jug - 100% lemon juice', expiresInDays: 180,
  },
  'Lemon zest': {
    purchaseQty: 16, purchaseUnit: 'oz', costPerUnit: 1.34,
    vendorKey: 'dryGoods', notes: '1 lb bag - dried lemon peel',
  },
  'Orange zest': {
    purchaseQty: 16, purchaseUnit: 'oz', costPerUnit: 1.24,
    vendorKey: 'dryGoods', notes: '1 lb bag - dried orange peel',
  },
  'Filtered water': {
    purchaseQty: 6, purchaseUnit: 'gal', costPerUnit: 0.88,
    vendorKey: null, notes: 'Municipal water + in-house filtration',
  },
  'Dried butterfly pea flowers': {
    purchaseQty: 16, purchaseUnit: 'oz', costPerUnit: 1.96,
    vendorKey: 'dryGoods', notes: '1 lb bag - Monterey Bay Herb Co',
  },

  // ============================================================
  // PRE-FERMENTS (cost based on component ingredients)
  // ============================================================
  'Levain': {
    purchaseQty: 10, purchaseUnit: 'lb', costPerUnit: 0.40,
    vendorKey: null, notes: 'Maintained in-house - cost is flour + water + labor',
  },
  'Poolish': {
    purchaseQty: 10, purchaseUnit: 'lb', costPerUnit: 0.30,
    vendorKey: null, notes: 'Mixed fresh per batch - 50% flour + 50% water + trace yeast',
  },
};

async function main() {
  console.log(DRY_RUN ? '🔍 DRY RUN MODE\n' : '🚀 ADDING INVENTORY LOTS\n');

  // Get the Daily Grains bakery
  const bakery = await prisma.bakery.findUnique({ where: { slug: 'daily-grains' } });
  if (!bakery) {
    console.error('❌ Daily Grains bakery not found');
    process.exit(1);
  }

  // Get all vendors
  const vendors = await prisma.vendor.findMany({ where: { bakeryId: bakery.id } });
  const vendorMap = new Map(vendors.map(v => [v.name, v]));

  // Get all ingredients without lots
  const ingredients = await prisma.ingredient.findMany({
    where: { bakeryId: bakery.id },
    include: {
      inventory: {
        include: { lots: true }
      }
    },
    orderBy: { name: 'asc' },
  });

  const withoutLots = ingredients.filter(i => {
    if (!i.inventory) return true;
    return i.inventory.lots.length === 0;
  });

  console.log(`Found ${withoutLots.length} ingredients without lots\n`);

  const purchaseDate = new Date('2026-01-20');
  let created = 0;
  let skipped = 0;

  for (const ingredient of withoutLots) {
    const lotDef = INGREDIENT_LOTS[ingredient.name];
    if (!lotDef) {
      console.log(`⚠️  No lot definition for: ${ingredient.name}`);
      skipped++;
      continue;
    }

    const vendor = lotDef.vendorKey
      ? vendorMap.get(VENDOR_NAMES[lotDef.vendorKey])
      : null;

    const expiresAt = lotDef.expiresInDays
      ? new Date(purchaseDate.getTime() + lotDef.expiresInDays * 24 * 60 * 60 * 1000)
      : null;

    if (DRY_RUN) {
      const totalCost = lotDef.purchaseQty * lotDef.costPerUnit;
      console.log(
        `📦 ${ingredient.name}: ${lotDef.purchaseQty} ${lotDef.purchaseUnit} @ $${lotDef.costPerUnit}/${lotDef.purchaseUnit} = $${totalCost.toFixed(2)}` +
        (vendor ? ` (${vendor.name})` : '') +
        (expiresAt ? ` [expires ${expiresAt.toISOString().split('T')[0]}]` : '')
      );
    } else {
      if (ingredient.inventory) {
        // Inventory record exists but has no lots — just add a lot
        await prisma.inventoryLot.create({
          data: {
            inventoryId: ingredient.inventory.id,
            purchaseQty: lotDef.purchaseQty,
            remainingQty: lotDef.purchaseQty,
            purchaseUnit: lotDef.purchaseUnit,
            costPerUnit: lotDef.costPerUnit,
            purchasedAt: purchaseDate,
            expiresAt,
            vendorId: vendor?.id ?? null,
            notes: lotDef.notes ?? null,
          },
        });
      } else {
        // No inventory record — create inventory + lot
        await prisma.inventory.create({
          data: {
            bakeryId: bakery.id,
            ingredientId: ingredient.id,
            displayUnit: ingredient.unit,
            lots: {
              create: [{
                purchaseQty: lotDef.purchaseQty,
                remainingQty: lotDef.purchaseQty,
                purchaseUnit: lotDef.purchaseUnit,
                costPerUnit: lotDef.costPerUnit,
                purchasedAt: purchaseDate,
                expiresAt,
                vendorId: vendor?.id ?? null,
                notes: lotDef.notes ?? null,
              }],
            },
          },
        });
      }
      console.log(`✅ ${ingredient.name}`);
    }
    created++;
  }

  console.log(`\n${DRY_RUN ? 'Would create' : 'Created'}: ${created} inventory lots`);
  if (skipped > 0) {
    console.log(`Skipped: ${skipped} ingredients (no lot definition)`);
  }
}

main()
  .then(() => prisma.$disconnect())
  .catch(async (e) => {
    console.error(e);
    await prisma.$disconnect();
    process.exit(1);
  });
