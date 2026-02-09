/* eslint-disable @typescript-eslint/no-unused-vars */
import { PrismaClient, EquipmentStatus, UsageReason } from '../src/generated/prisma';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Starting database seed...\n');

  // Clean existing data in development
  if (process.env.NODE_ENV === 'development') {
    console.log('🗑️  Cleaning existing data...');
    await prisma.productionSheet.deleteMany();
    await prisma.inventoryUsage.deleteMany();
    await prisma.inventoryLot.deleteMany();
    await prisma.inventory.deleteMany();
    await prisma.recipeSectionIngredient.deleteMany();
    await prisma.recipeSection.deleteMany();
    await prisma.recipe.deleteMany();
    await prisma.entityTag.deleteMany();
    await prisma.tag.deleteMany();
    await prisma.tagType.deleteMany();
    await prisma.ingredientVendor.deleteMany();
    await prisma.ingredient.deleteMany();
    await prisma.unitConversion.deleteMany();
    await prisma.vendorContact.deleteMany();
    await prisma.vendor.deleteMany();
    await prisma.equipment.deleteMany();
    await prisma.userBakery.deleteMany();
    // Only delete demo users (those with clerkId starting with "demo_"), preserve real Clerk users
    await prisma.user.deleteMany({
      where: { clerkId: { startsWith: 'demo_' } },
    });
    await prisma.role.deleteMany();
    await prisma.bakery.deleteMany();
    console.log('✅ Cleanup complete\n');
  }

  // ==========================================================================
  // Create Bakeries
  // ==========================================================================
  console.log('🏪 Creating bakeries...');

  const dailyGrains = await prisma.bakery.create({
    data: {
      name: 'Daily Grains Bakery',
      slug: 'daily-grains',
      address: '123 Heritage Lane, Portland, OR 97201',
      phone: '(503) 555-0100',
      email: 'hello@dailygrains.co',
      website: 'https://dailygrains.co',
      isActive: true,
    },
  });

  const sweetTreats = await prisma.bakery.create({
    data: {
      name: 'Sweet Treats Pastry Shop',
      slug: 'sweet-treats',
      address: '456 Oak Avenue, Austin, TX 78701',
      phone: '(512) 555-0200',
      email: 'info@sweettreats.com',
      website: 'https://sweettreats.com',
      isActive: true,
    },
  });

  const _rusticLoaves = await prisma.bakery.create({
    data: {
      name: 'Rustic Loaves Bakery',
      slug: 'rustic-loaves',
      address: '789 Elm Boulevard, Brooklyn, NY 11201',
      phone: '(718) 555-0300',
      email: 'contact@rusticloaves.com',
      website: 'https://rusticloaves.com',
      isActive: true,
    },
  });

  console.log(`✅ Created 3 bakeries\n`);

  // ==========================================================================
  // Create Platform-Wide Roles
  // ==========================================================================
  console.log('👔 Creating platform-wide roles...');

  const ownerRole = await prisma.role.create({
    data: {
      name: 'Owner',
      description: 'Full access to all bakery operations',
      permissions: {
        bakery: { manage: true },
        users: { invite: true, manage: true },
        recipes: { create: true, edit: true, delete: true },
        inventory: { view: true, edit: true, order: true },
        production: { view: true, create: true, complete: true },
        reports: { view: true, export: true },
        equipment: { view: true, edit: true },
        vendors: { view: true, edit: true },
      },
    },
  });

  const managerRole = await prisma.role.create({
    data: {
      name: 'Manager',
      description: 'Manage daily operations',
      permissions: {
        recipes: { create: true, edit: true, delete: false },
        inventory: { view: true, edit: true, order: true },
        production: { view: true, create: true, complete: true },
        reports: { view: true, export: false },
        equipment: { view: true, edit: false },
        vendors: { view: true, edit: false },
      },
    },
  });

  const bakerRole = await prisma.role.create({
    data: {
      name: 'Baker',
      description: 'Execute baking operations',
      permissions: {
        recipes: { view: true },
        inventory: { view: true, edit: false },
        production: { view: true, create: false, complete: true },
        reports: { view: false },
      },
    },
  });

  console.log(`✅ Created 3 platform-wide roles\n`);

  // ==========================================================================
  // Create Users
  // ==========================================================================
  console.log('👥 Creating users...');

  // Daily Grains Users
  const _dailyGrainsOwner = await prisma.user.create({
    data: {
      clerkId: 'demo_dailygrains_owner',
      email: 'owner@dailygrains.co',
      name: 'Paul Bonneville',
      roleId: ownerRole.id,
      isPlatformAdmin: false,
      lastLoginAt: new Date(),
      bakeries: {
        create: {
          bakeryId: dailyGrains.id,
        },
      },
    },
  });

  const dailyGrainsManager = await prisma.user.create({
    data: {
      clerkId: 'demo_dailygrains_manager',
      email: 'manager@dailygrains.co',
      name: 'Michael Chen',
      roleId: managerRole.id,
      isPlatformAdmin: false,
      lastLoginAt: new Date(),
      bakeries: {
        create: {
          bakeryId: dailyGrains.id,
        },
      },
    },
  });

  const dailyGrainsBaker = await prisma.user.create({
    data: {
      clerkId: 'demo_dailygrains_baker',
      email: 'baker@dailygrains.co',
      name: 'Emma Rodriguez',
      roleId: bakerRole.id,
      isPlatformAdmin: false,
      lastLoginAt: new Date(),
      bakeries: {
        create: {
          bakeryId: dailyGrains.id,
        },
      },
    },
  });

  // Sweet Treats Users
  const _sweetTreatsOwner = await prisma.user.create({
    data: {
      clerkId: 'demo_sweetreats_owner',
      email: 'owner@sweettreats.com',
      name: 'David Martinez',
      roleId: ownerRole.id,
      isPlatformAdmin: false,
      lastLoginAt: new Date(),
      bakeries: {
        create: {
          bakeryId: sweetTreats.id,
        },
      },
    },
  });

  console.log(`✅ Created 4 demo users`);

  // Update real platform admin user (paul@dailygrains.co) to be admin and connect to Daily Grains
  const existingAdmin = await prisma.user.findFirst({
    where: { email: 'paul@dailygrains.co' },
    include: { bakeries: true },
  });

  if (existingAdmin) {
    // Update to be platform admin with owner role
    await prisma.user.update({
      where: { id: existingAdmin.id },
      data: {
        isPlatformAdmin: true,
        roleId: ownerRole.id,
      },
    });

    // Connect to Daily Grains if not already connected
    const hasConnection = existingAdmin.bakeries.some(b => b.bakeryId === dailyGrains.id);
    if (!hasConnection) {
      await prisma.userBakery.create({
        data: {
          userId: existingAdmin.id,
          bakeryId: dailyGrains.id,
        },
      });
    }
    console.log(`✅ Updated paul@dailygrains.co as platform admin connected to Daily Grains\n`);
  } else {
    console.log(`\n`);
  }

  // ==========================================================================
  // Create Unit Conversions
  // ==========================================================================
  console.log('⚖️  Creating unit conversions...');

  await prisma.unitConversion.createMany({
    data: [
      // Weight conversions
      { fromUnit: 'kg', toUnit: 'g', factor: 1000, category: 'weight' },
      { fromUnit: 'g', toUnit: 'kg', factor: 0.001, category: 'weight' },
      { fromUnit: 'lb', toUnit: 'oz', factor: 16, category: 'weight' },
      { fromUnit: 'oz', toUnit: 'lb', factor: 0.0625, category: 'weight' },
      { fromUnit: 'kg', toUnit: 'lb', factor: 2.20462, category: 'weight' },
      { fromUnit: 'lb', toUnit: 'kg', factor: 0.453592, category: 'weight' },
      { fromUnit: 'lb', toUnit: 'g', factor: 453.592, category: 'weight' },
      { fromUnit: 'g', toUnit: 'oz', factor: 0.035274, category: 'weight' },

      // Volume conversions
      { fromUnit: 'L', toUnit: 'mL', factor: 1000, category: 'volume' },
      { fromUnit: 'mL', toUnit: 'L', factor: 0.001, category: 'volume' },
      { fromUnit: 'gal', toUnit: 'qt', factor: 4, category: 'volume' },
      { fromUnit: 'qt', toUnit: 'gal', factor: 0.25, category: 'volume' },
      { fromUnit: 'cup', toUnit: 'mL', factor: 236.588, category: 'volume' },
      { fromUnit: 'mL', toUnit: 'cup', factor: 0.00422675, category: 'volume' },
      { fromUnit: 'tbsp', toUnit: 'mL', factor: 14.7868, category: 'volume' },
      { fromUnit: 'tsp', toUnit: 'mL', factor: 4.92892, category: 'volume' },
    ],
  });

  console.log(`✅ Created 16 unit conversions\n`);

  // ==========================================================================
  // Create Vendors (for Daily Grains)
  // ==========================================================================
  console.log('🚚 Creating vendors...');

  const flourVendor = await prisma.vendor.create({
    data: {
      bakeryId: dailyGrains.id,
      name: 'Camas Country Mill',
      email: 'orders@camascountrymill.com',
      phone: '(541) 555-1000',
      website: 'https://camascountrymill.com',
      notes: 'Local heritage grain supplier - organic whole grain flours',
      contacts: {
        create: [
          {
            name: 'Tom Williams',
            title: 'Sales Representative',
            email: 'tom@camascountrymill.com',
            phone: '(541) 555-1001',
          },
        ],
      },
    },
  });

  const organicFlourVendor = await prisma.vendor.create({
    data: {
      bakeryId: dailyGrains.id,
      name: 'Central Milling Company',
      email: 'orders@centralmilling.com',
      phone: '(801) 555-1100',
      website: 'https://centralmilling.com',
      notes: 'Organic bread flour and specialty flours',
      contacts: {
        create: [
          {
            name: 'Sarah Mills',
            title: 'Account Manager',
            email: 'sarah@centralmilling.com',
            phone: '(801) 555-1101',
          },
        ],
      },
    },
  });

  const dairyVendor = await prisma.vendor.create({
    data: {
      bakeryId: dailyGrains.id,
      name: 'Organic Valley',
      email: 'orders@organicvalley.coop',
      phone: '(888) 555-2000',
      website: 'https://organicvalley.coop',
      notes: 'Organic butter, milk, and eggs',
      contacts: {
        create: [
          {
            name: 'Lisa Anderson',
            title: 'Account Manager',
            email: 'lisa@organicvalley.coop',
            phone: '(888) 555-2001',
          },
        ],
      },
    },
  });

  const chocolateVendor = await prisma.vendor.create({
    data: {
      bakeryId: dailyGrains.id,
      name: 'Guittard Chocolate',
      email: 'orders@guittard.com',
      phone: '(650) 555-3000',
      website: 'https://guittard.com',
      notes: 'Premium chocolate chips and chunks',
      contacts: {
        create: [
          {
            name: 'Mark Chen',
            title: 'Sales Rep',
            email: 'mark@guittard.com',
            phone: '(650) 555-3001',
          },
        ],
      },
    },
  });

  const dryGoodsVendor = await prisma.vendor.create({
    data: {
      bakeryId: dailyGrains.id,
      name: 'Azure Standard',
      email: 'orders@azurestandard.com',
      phone: '(541) 555-4000',
      website: 'https://azurestandard.com',
      notes: 'Organic dried fruits, nuts, seeds, sugars, and spices',
      contacts: {
        create: [
          {
            name: 'Emily Rose',
            title: 'Customer Service',
            email: 'emily@azurestandard.com',
            phone: '(541) 555-4001',
          },
        ],
      },
    },
  });

  console.log(`✅ Created 5 vendors\n`);

  // ==========================================================================
  // Create Ingredients (for Daily Grains) - Real ingredients from Square menu
  // ==========================================================================
  console.log('🧪 Creating ingredients...');

  // ----- FLOURS & GRAINS -----
  const breadFlour = await prisma.ingredient.create({
    data: { bakeryId: dailyGrains.id, name: 'Bread flour', unit: 'lb' },
  });

  const allPurposeFlour = await prisma.ingredient.create({
    data: { bakeryId: dailyGrains.id, name: 'All-purpose flour', unit: 'lb' },
  });

  const whiteSonoraFlour = await prisma.ingredient.create({
    data: { bakeryId: dailyGrains.id, name: 'White Sonora wheat berries', unit: 'lb' },
  });

  const turkeyRedFlour = await prisma.ingredient.create({
    data: { bakeryId: dailyGrains.id, name: 'Turkey Red wheat berries', unit: 'lb' },
  });

  const rougeFlour = await prisma.ingredient.create({
    data: { bakeryId: dailyGrains.id, name: 'Rouge de Bordeaux wheat berries', unit: 'lb' },
  });

  const einkornFlour = await prisma.ingredient.create({
    data: { bakeryId: dailyGrains.id, name: 'Einkorn berries', unit: 'lb' },
  });

  const speltFlour = await prisma.ingredient.create({
    data: { bakeryId: dailyGrains.id, name: 'Spelt berries', unit: 'lb' },
  });

  const kamutFlour = await prisma.ingredient.create({
    data: { bakeryId: dailyGrains.id, name: 'Kamut berries', unit: 'lb' },
  });

  const kernzaFlour = await prisma.ingredient.create({
    data: { bakeryId: dailyGrains.id, name: 'Kernza grain', unit: 'lb' },
  });

  const yecoraRojoFlour = await prisma.ingredient.create({
    data: { bakeryId: dailyGrains.id, name: 'Yecora Rojo wheat berries', unit: 'lb' },
  });

  const emmerFlour = await prisma.ingredient.create({
    data: { bakeryId: dailyGrains.id, name: 'Emmer berries', unit: 'lb' },
  });

  const darkRyeFlour = await prisma.ingredient.create({
    data: { bakeryId: dailyGrains.id, name: 'Dark rye flour', unit: 'lb' },
  });

  const oatFlour = await prisma.ingredient.create({
    data: { bakeryId: dailyGrains.id, name: 'Whole grain oat flour', unit: 'lb' },
  });

  const riceFlour = await prisma.ingredient.create({
    data: { bakeryId: dailyGrains.id, name: 'Rice flour (for prep)', unit: 'lb' },
  });

  const thickRolledOats = await prisma.ingredient.create({
    data: { bakeryId: dailyGrains.id, name: 'Thick rolled oats', unit: 'lb' },
  });

  const wholeOatGroats = await prisma.ingredient.create({
    data: { bakeryId: dailyGrains.id, name: 'Whole oat groats', unit: 'lb' },
  });

  const ryeFlakes = await prisma.ingredient.create({
    data: { bakeryId: dailyGrains.id, name: 'Rye flakes', unit: 'lb' },
  });

  const wheatFlakes = await prisma.ingredient.create({
    data: { bakeryId: dailyGrains.id, name: 'Wheat flakes', unit: 'lb' },
  });

  // ----- DAIRY & EGGS -----
  const butter = await prisma.ingredient.create({
    data: { bakeryId: dailyGrains.id, name: 'Unsalted butter', unit: 'lb' },
  });

  const saltedButter = await prisma.ingredient.create({
    data: { bakeryId: dailyGrains.id, name: 'Salted butter', unit: 'lb' },
  });

  const eggs = await prisma.ingredient.create({
    data: { bakeryId: dailyGrains.id, name: 'Eggs', unit: 'dozen' },
  });

  const milk = await prisma.ingredient.create({
    data: { bakeryId: dailyGrains.id, name: 'Whole milk', unit: 'gal' },
  });

  const buttermilk = await prisma.ingredient.create({
    data: { bakeryId: dailyGrains.id, name: 'Buttermilk', unit: 'qt' },
  });

  const nonfatDryMilk = await prisma.ingredient.create({
    data: { bakeryId: dailyGrains.id, name: 'Nonfat dry milk', unit: 'lb' },
  });

  const parmesanCheese = await prisma.ingredient.create({
    data: { bakeryId: dailyGrains.id, name: 'Parmesan cheese', unit: 'lb' },
  });

  const cheddarCheese = await prisma.ingredient.create({
    data: { bakeryId: dailyGrains.id, name: 'Extra sharp cheddar cheese', unit: 'lb' },
  });

  // ----- SUGARS & SWEETENERS -----
  const caneS = await prisma.ingredient.create({
    data: { bakeryId: dailyGrains.id, name: 'Cane sugar', unit: 'lb' },
  });

  const brownSugar = await prisma.ingredient.create({
    data: { bakeryId: dailyGrains.id, name: 'Dark brown sugar', unit: 'lb' },
  });

  const lightBrownSugar = await prisma.ingredient.create({
    data: { bakeryId: dailyGrains.id, name: 'Light brown sugar', unit: 'lb' },
  });

  const powderedSugar = await prisma.ingredient.create({
    data: { bakeryId: dailyGrains.id, name: 'Powdered sugar', unit: 'lb' },
  });

  const honey = await prisma.ingredient.create({
    data: { bakeryId: dailyGrains.id, name: 'Honey', unit: 'lb' },
  });

  const molasses = await prisma.ingredient.create({
    data: { bakeryId: dailyGrains.id, name: 'Molasses', unit: 'qt' },
  });

  // ----- CHOCOLATE -----
  const darkChocolateChips = await prisma.ingredient.create({
    data: { bakeryId: dailyGrains.id, name: 'Dark chocolate chips (70%)', unit: 'lb' },
  });

  const darkChocolateChips55 = await prisma.ingredient.create({
    data: { bakeryId: dailyGrains.id, name: 'Dark chocolate chips (55%)', unit: 'lb' },
  });

  const darkChocolateChips85 = await prisma.ingredient.create({
    data: { bakeryId: dailyGrains.id, name: 'Dark chocolate chips (85%)', unit: 'lb' },
  });

  const milkChocolateChips = await prisma.ingredient.create({
    data: { bakeryId: dailyGrains.id, name: 'Milk chocolate chips (38%)', unit: 'lb' },
  });

  const whiteChocolateChips = await prisma.ingredient.create({
    data: { bakeryId: dailyGrains.id, name: 'White chocolate chips', unit: 'lb' },
  });

  const darkChocolateChunks = await prisma.ingredient.create({
    data: { bakeryId: dailyGrains.id, name: 'Dark chocolate chunks (70%)', unit: 'lb' },
  });

  const cocoaPowder = await prisma.ingredient.create({
    data: { bakeryId: dailyGrains.id, name: 'Cocoa powder', unit: 'lb' },
  });

  // ----- NUTS & SEEDS -----
  const pecans = await prisma.ingredient.create({
    data: { bakeryId: dailyGrains.id, name: 'Pecans', unit: 'lb' },
  });

  const walnuts = await prisma.ingredient.create({
    data: { bakeryId: dailyGrains.id, name: 'Walnuts', unit: 'lb' },
  });

  const pistachios = await prisma.ingredient.create({
    data: { bakeryId: dailyGrains.id, name: 'Pistachios', unit: 'lb' },
  });

  const sunflowerSeeds = await prisma.ingredient.create({
    data: { bakeryId: dailyGrains.id, name: 'Sunflower seeds', unit: 'lb' },
  });

  const sesameSeeds = await prisma.ingredient.create({
    data: { bakeryId: dailyGrains.id, name: 'Sesame seeds', unit: 'lb' },
  });

  const flaxseed = await prisma.ingredient.create({
    data: { bakeryId: dailyGrains.id, name: 'Brown flaxseed', unit: 'lb' },
  });

  const poppySeeds = await prisma.ingredient.create({
    data: { bakeryId: dailyGrains.id, name: 'Poppy seeds', unit: 'lb' },
  });

  const hulledMillet = await prisma.ingredient.create({
    data: { bakeryId: dailyGrains.id, name: 'Hulled millet', unit: 'lb' },
  });

  // ----- DRIED FRUITS -----
  const driedApples = await prisma.ingredient.create({
    data: { bakeryId: dailyGrains.id, name: 'Dried apples', unit: 'lb' },
  });

  const driedApricots = await prisma.ingredient.create({
    data: { bakeryId: dailyGrains.id, name: 'Unsulfured dried apricots', unit: 'lb' },
  });

  const driedCherries = await prisma.ingredient.create({
    data: { bakeryId: dailyGrains.id, name: 'Unsulfured dried cherries', unit: 'lb' },
  });

  const raisins = await prisma.ingredient.create({
    data: { bakeryId: dailyGrains.id, name: 'Raisins', unit: 'lb' },
  });

  const driedCranberries = await prisma.ingredient.create({
    data: { bakeryId: dailyGrains.id, name: 'Dried cranberries', unit: 'lb' },
  });

  // ----- SPICES & FLAVORINGS -----
  const seaSalt = await prisma.ingredient.create({
    data: { bakeryId: dailyGrains.id, name: 'Sea salt', unit: 'lb' },
  });

  const pinkSeaSalt = await prisma.ingredient.create({
    data: { bakeryId: dailyGrains.id, name: 'Pink sea salt', unit: 'lb' },
  });

  const cinnamon = await prisma.ingredient.create({
    data: { bakeryId: dailyGrains.id, name: 'Cinnamon', unit: 'oz' },
  });

  const nutmeg = await prisma.ingredient.create({
    data: { bakeryId: dailyGrains.id, name: 'Nutmeg', unit: 'oz' },
  });

  const cardamom = await prisma.ingredient.create({
    data: { bakeryId: dailyGrains.id, name: 'Cardamom', unit: 'oz' },
  });

  const ginger = await prisma.ingredient.create({
    data: { bakeryId: dailyGrains.id, name: 'Ground ginger', unit: 'oz' },
  });

  const allspice = await prisma.ingredient.create({
    data: { bakeryId: dailyGrains.id, name: 'Allspice', unit: 'oz' },
  });

  const vanilla = await prisma.ingredient.create({
    data: { bakeryId: dailyGrains.id, name: 'Vanilla extract', unit: 'oz' },
  });

  const cloves = await prisma.ingredient.create({
    data: { bakeryId: dailyGrains.id, name: 'Ground cloves', unit: 'oz' },
  });

  const blackPepper = await prisma.ingredient.create({
    data: { bakeryId: dailyGrains.id, name: 'Black peppercorns', unit: 'oz' },
  });

  const turmeric = await prisma.ingredient.create({
    data: { bakeryId: dailyGrains.id, name: 'Ground turmeric', unit: 'oz' },
  });

  const creamOfTartar = await prisma.ingredient.create({
    data: { bakeryId: dailyGrains.id, name: 'Cream of tartar', unit: 'oz' },
  });

  // ----- HERBS -----
  const freshRosemary = await prisma.ingredient.create({
    data: { bakeryId: dailyGrains.id, name: 'Fresh rosemary', unit: 'oz' },
  });

  const driedRosemary = await prisma.ingredient.create({
    data: { bakeryId: dailyGrains.id, name: 'Dried rosemary', unit: 'oz' },
  });

  const sage = await prisma.ingredient.create({
    data: { bakeryId: dailyGrains.id, name: 'Sage', unit: 'oz' },
  });

  const driedBasil = await prisma.ingredient.create({
    data: { bakeryId: dailyGrains.id, name: 'Dried basil', unit: 'oz' },
  });

  const driedOregano = await prisma.ingredient.create({
    data: { bakeryId: dailyGrains.id, name: 'Dried oregano', unit: 'oz' },
  });

  const redPepperFlakes = await prisma.ingredient.create({
    data: { bakeryId: dailyGrains.id, name: 'Red pepper flakes', unit: 'oz' },
  });

  const garlicPowder = await prisma.ingredient.create({
    data: { bakeryId: dailyGrains.id, name: 'Garlic powder', unit: 'oz' },
  });

  const onionPowder = await prisma.ingredient.create({
    data: { bakeryId: dailyGrains.id, name: 'Onion powder', unit: 'oz' },
  });

  // ----- OTHER -----
  const sourdoughCulture = await prisma.ingredient.create({
    data: { bakeryId: dailyGrains.id, name: 'Sourdough starter', unit: 'lb' },
  });

  const levain = await prisma.ingredient.create({
    data: { bakeryId: dailyGrains.id, name: 'Levain', unit: 'lb' },
  });

  const poolish = await prisma.ingredient.create({
    data: { bakeryId: dailyGrains.id, name: 'Poolish', unit: 'lb' },
  });

  const oliveOil = await prisma.ingredient.create({
    data: { bakeryId: dailyGrains.id, name: 'Extra virgin olive oil', unit: 'L' },
  });

  const instantYeast = await prisma.ingredient.create({
    data: { bakeryId: dailyGrains.id, name: 'Instant yeast', unit: 'lb' },
  });

  const bakingSoda = await prisma.ingredient.create({
    data: { bakeryId: dailyGrains.id, name: 'Baking soda', unit: 'lb' },
  });

  const bakingPowder = await prisma.ingredient.create({
    data: { bakeryId: dailyGrains.id, name: 'Baking powder', unit: 'lb' },
  });

  const lemonZest = await prisma.ingredient.create({
    data: { bakeryId: dailyGrains.id, name: 'Lemon zest', unit: 'oz' },
  });

  const lemonJuice = await prisma.ingredient.create({
    data: { bakeryId: dailyGrains.id, name: 'Lemon juice', unit: 'oz' },
  });

  const orangeZest = await prisma.ingredient.create({
    data: { bakeryId: dailyGrains.id, name: 'Orange zest', unit: 'oz' },
  });

  const butterflyPeaFlowers = await prisma.ingredient.create({
    data: { bakeryId: dailyGrains.id, name: 'Dried butterfly pea flowers', unit: 'oz' },
  });

  const water = await prisma.ingredient.create({
    data: { bakeryId: dailyGrains.id, name: 'Filtered water', unit: 'gal' },
  });

  console.log(`✅ Created 85 ingredients`);

  // Assign vendors to ingredients
  const ingredientVendorAssignments = [
    // Heritage/Specialty flours from Camas Country Mill
    { ingredientId: whiteSonoraFlour.id, vendorId: flourVendor.id },
    { ingredientId: turkeyRedFlour.id, vendorId: flourVendor.id },
    { ingredientId: rougeFlour.id, vendorId: flourVendor.id },
    { ingredientId: einkornFlour.id, vendorId: flourVendor.id },
    { ingredientId: speltFlour.id, vendorId: flourVendor.id },
    { ingredientId: kamutFlour.id, vendorId: flourVendor.id },
    { ingredientId: kernzaFlour.id, vendorId: flourVendor.id },
    { ingredientId: yecoraRojoFlour.id, vendorId: flourVendor.id },
    { ingredientId: emmerFlour.id, vendorId: flourVendor.id },

    // Organic flours from Central Milling
    { ingredientId: breadFlour.id, vendorId: organicFlourVendor.id },
    { ingredientId: allPurposeFlour.id, vendorId: organicFlourVendor.id },
    { ingredientId: darkRyeFlour.id, vendorId: organicFlourVendor.id },
    { ingredientId: oatFlour.id, vendorId: organicFlourVendor.id },
    { ingredientId: riceFlour.id, vendorId: organicFlourVendor.id },

    // Dairy from Organic Valley
    { ingredientId: butter.id, vendorId: dairyVendor.id },
    { ingredientId: eggs.id, vendorId: dairyVendor.id },
    { ingredientId: milk.id, vendorId: dairyVendor.id },
    { ingredientId: buttermilk.id, vendorId: dairyVendor.id },

    // Chocolate from Guittard
    { ingredientId: darkChocolateChips.id, vendorId: chocolateVendor.id },
    { ingredientId: milkChocolateChips.id, vendorId: chocolateVendor.id },
    { ingredientId: whiteChocolateChips.id, vendorId: chocolateVendor.id },
    { ingredientId: darkChocolateChunks.id, vendorId: chocolateVendor.id },
    { ingredientId: cocoaPowder.id, vendorId: chocolateVendor.id },

    // Dry goods from Azure Standard
    { ingredientId: thickRolledOats.id, vendorId: dryGoodsVendor.id },
    { ingredientId: wholeOatGroats.id, vendorId: dryGoodsVendor.id },
    { ingredientId: ryeFlakes.id, vendorId: dryGoodsVendor.id },
    { ingredientId: wheatFlakes.id, vendorId: dryGoodsVendor.id },
    { ingredientId: caneS.id, vendorId: dryGoodsVendor.id },
    { ingredientId: brownSugar.id, vendorId: dryGoodsVendor.id },
    { ingredientId: powderedSugar.id, vendorId: dryGoodsVendor.id },
    { ingredientId: honey.id, vendorId: dryGoodsVendor.id },
    { ingredientId: molasses.id, vendorId: dryGoodsVendor.id },
    { ingredientId: pecans.id, vendorId: dryGoodsVendor.id },
    { ingredientId: pistachios.id, vendorId: dryGoodsVendor.id },
    { ingredientId: sunflowerSeeds.id, vendorId: dryGoodsVendor.id },
    { ingredientId: sesameSeeds.id, vendorId: dryGoodsVendor.id },
    { ingredientId: flaxseed.id, vendorId: dryGoodsVendor.id },
    { ingredientId: poppySeeds.id, vendorId: dryGoodsVendor.id },
    { ingredientId: hulledMillet.id, vendorId: dryGoodsVendor.id },
    { ingredientId: driedApples.id, vendorId: dryGoodsVendor.id },
    { ingredientId: driedApricots.id, vendorId: dryGoodsVendor.id },
    { ingredientId: driedCherries.id, vendorId: dryGoodsVendor.id },
    { ingredientId: raisins.id, vendorId: dryGoodsVendor.id },
    { ingredientId: driedCranberries.id, vendorId: dryGoodsVendor.id },
    { ingredientId: seaSalt.id, vendorId: dryGoodsVendor.id },
    { ingredientId: cinnamon.id, vendorId: dryGoodsVendor.id },
    { ingredientId: nutmeg.id, vendorId: dryGoodsVendor.id },
    { ingredientId: cardamom.id, vendorId: dryGoodsVendor.id },
    { ingredientId: ginger.id, vendorId: dryGoodsVendor.id },
    { ingredientId: allspice.id, vendorId: dryGoodsVendor.id },
    { ingredientId: vanilla.id, vendorId: dryGoodsVendor.id },
    { ingredientId: cloves.id, vendorId: dryGoodsVendor.id },
    { ingredientId: oliveOil.id, vendorId: dryGoodsVendor.id },
    { ingredientId: instantYeast.id, vendorId: dryGoodsVendor.id },
    { ingredientId: bakingSoda.id, vendorId: dryGoodsVendor.id },
    { ingredientId: bakingPowder.id, vendorId: dryGoodsVendor.id },
  ];

  await prisma.ingredientVendor.createMany({
    data: ingredientVendorAssignments,
  });

  console.log(`✅ Assigned vendors to ${ingredientVendorAssignments.length} ingredients\n`);

  // ==========================================================================
  // Create Tag Types and Tags (for Daily Grains)
  // ==========================================================================
  console.log('🏷️  Creating tag types and tags...');

  // Create single tag type for ingredient categories (like grocery store sections)
  const categoryTagType = await prisma.tagType.create({
    data: {
      bakeryId: dailyGrains.id,
      name: 'Category',
      description: 'Ingredient categories (like grocery store sections)',
      order: 0,
    },
  });

  // Create category tags with distinct colors
  const floursGrainsTag = await prisma.tag.create({
    data: { bakeryId: dailyGrains.id, tagTypeId: categoryTagType.id, name: 'Flours & Grains', color: '#D4A574' }, // Wheat/tan
  });

  const dairyEggsTag = await prisma.tag.create({
    data: { bakeryId: dailyGrains.id, tagTypeId: categoryTagType.id, name: 'Dairy & Eggs', color: '#87CEEB' }, // Light blue
  });

  const sweetenersTag = await prisma.tag.create({
    data: { bakeryId: dailyGrains.id, tagTypeId: categoryTagType.id, name: 'Sweeteners', color: '#FFD700' }, // Golden
  });

  const chocolateTag = await prisma.tag.create({
    data: { bakeryId: dailyGrains.id, tagTypeId: categoryTagType.id, name: 'Chocolate', color: '#5D3A1A' }, // Dark brown
  });

  const nutsSeedsTag = await prisma.tag.create({
    data: { bakeryId: dailyGrains.id, tagTypeId: categoryTagType.id, name: 'Nuts & Seeds', color: '#8B7355' }, // Nutty brown
  });

  const driedFruitsTag = await prisma.tag.create({
    data: { bakeryId: dailyGrains.id, tagTypeId: categoryTagType.id, name: 'Dried Fruits', color: '#FF6B6B' }, // Reddish
  });

  const spicesTag = await prisma.tag.create({
    data: { bakeryId: dailyGrains.id, tagTypeId: categoryTagType.id, name: 'Spices', color: '#C4721A' }, // Spice orange
  });

  const herbsSeasoningsTag = await prisma.tag.create({
    data: { bakeryId: dailyGrains.id, tagTypeId: categoryTagType.id, name: 'Herbs & Seasonings', color: '#228B22' }, // Forest green
  });

  const leaveningTag = await prisma.tag.create({
    data: { bakeryId: dailyGrains.id, tagTypeId: categoryTagType.id, name: 'Leavening', color: '#E8E8E8' }, // Light gray (bubbly)
  });

  const oilsTag = await prisma.tag.create({
    data: { bakeryId: dailyGrains.id, tagTypeId: categoryTagType.id, name: 'Oils', color: '#9ACD32' }, // Yellow-green (olive)
  });

  const citrusTag = await prisma.tag.create({
    data: { bakeryId: dailyGrains.id, tagTypeId: categoryTagType.id, name: 'Citrus', color: '#FFA500' }, // Orange
  });

  const specialtyTag = await prisma.tag.create({
    data: { bakeryId: dailyGrains.id, tagTypeId: categoryTagType.id, name: 'Specialty', color: '#9370DB' }, // Purple
  });

  // Assign category tags to all ingredients
  const ingredientTagAssignments = [
    // Flours & Grains
    { tagId: floursGrainsTag.id, entityType: 'ingredient', entityId: breadFlour.id },
    { tagId: floursGrainsTag.id, entityType: 'ingredient', entityId: allPurposeFlour.id },
    { tagId: floursGrainsTag.id, entityType: 'ingredient', entityId: whiteSonoraFlour.id },
    { tagId: floursGrainsTag.id, entityType: 'ingredient', entityId: turkeyRedFlour.id },
    { tagId: floursGrainsTag.id, entityType: 'ingredient', entityId: rougeFlour.id },
    { tagId: floursGrainsTag.id, entityType: 'ingredient', entityId: einkornFlour.id },
    { tagId: floursGrainsTag.id, entityType: 'ingredient', entityId: speltFlour.id },
    { tagId: floursGrainsTag.id, entityType: 'ingredient', entityId: kamutFlour.id },
    { tagId: floursGrainsTag.id, entityType: 'ingredient', entityId: kernzaFlour.id },
    { tagId: floursGrainsTag.id, entityType: 'ingredient', entityId: yecoraRojoFlour.id },
    { tagId: floursGrainsTag.id, entityType: 'ingredient', entityId: emmerFlour.id },
    { tagId: floursGrainsTag.id, entityType: 'ingredient', entityId: darkRyeFlour.id },
    { tagId: floursGrainsTag.id, entityType: 'ingredient', entityId: oatFlour.id },
    { tagId: floursGrainsTag.id, entityType: 'ingredient', entityId: riceFlour.id },
    { tagId: floursGrainsTag.id, entityType: 'ingredient', entityId: thickRolledOats.id },
    { tagId: floursGrainsTag.id, entityType: 'ingredient', entityId: wholeOatGroats.id },
    { tagId: floursGrainsTag.id, entityType: 'ingredient', entityId: ryeFlakes.id },
    { tagId: floursGrainsTag.id, entityType: 'ingredient', entityId: wheatFlakes.id },

    // Dairy & Eggs
    { tagId: dairyEggsTag.id, entityType: 'ingredient', entityId: butter.id },
    { tagId: dairyEggsTag.id, entityType: 'ingredient', entityId: saltedButter.id },
    { tagId: dairyEggsTag.id, entityType: 'ingredient', entityId: eggs.id },
    { tagId: dairyEggsTag.id, entityType: 'ingredient', entityId: milk.id },
    { tagId: dairyEggsTag.id, entityType: 'ingredient', entityId: buttermilk.id },
    { tagId: dairyEggsTag.id, entityType: 'ingredient', entityId: nonfatDryMilk.id },
    { tagId: dairyEggsTag.id, entityType: 'ingredient', entityId: parmesanCheese.id },
    { tagId: dairyEggsTag.id, entityType: 'ingredient', entityId: cheddarCheese.id },

    // Sweeteners
    { tagId: sweetenersTag.id, entityType: 'ingredient', entityId: caneS.id },
    { tagId: sweetenersTag.id, entityType: 'ingredient', entityId: brownSugar.id },
    { tagId: sweetenersTag.id, entityType: 'ingredient', entityId: lightBrownSugar.id },
    { tagId: sweetenersTag.id, entityType: 'ingredient', entityId: powderedSugar.id },
    { tagId: sweetenersTag.id, entityType: 'ingredient', entityId: honey.id },
    { tagId: sweetenersTag.id, entityType: 'ingredient', entityId: molasses.id },

    // Chocolate
    { tagId: chocolateTag.id, entityType: 'ingredient', entityId: darkChocolateChips.id },
    { tagId: chocolateTag.id, entityType: 'ingredient', entityId: darkChocolateChips55.id },
    { tagId: chocolateTag.id, entityType: 'ingredient', entityId: darkChocolateChips85.id },
    { tagId: chocolateTag.id, entityType: 'ingredient', entityId: milkChocolateChips.id },
    { tagId: chocolateTag.id, entityType: 'ingredient', entityId: whiteChocolateChips.id },
    { tagId: chocolateTag.id, entityType: 'ingredient', entityId: darkChocolateChunks.id },
    { tagId: chocolateTag.id, entityType: 'ingredient', entityId: cocoaPowder.id },

    // Nuts & Seeds
    { tagId: nutsSeedsTag.id, entityType: 'ingredient', entityId: pecans.id },
    { tagId: nutsSeedsTag.id, entityType: 'ingredient', entityId: walnuts.id },
    { tagId: nutsSeedsTag.id, entityType: 'ingredient', entityId: pistachios.id },
    { tagId: nutsSeedsTag.id, entityType: 'ingredient', entityId: sunflowerSeeds.id },
    { tagId: nutsSeedsTag.id, entityType: 'ingredient', entityId: sesameSeeds.id },
    { tagId: nutsSeedsTag.id, entityType: 'ingredient', entityId: flaxseed.id },
    { tagId: nutsSeedsTag.id, entityType: 'ingredient', entityId: poppySeeds.id },
    { tagId: nutsSeedsTag.id, entityType: 'ingredient', entityId: hulledMillet.id },

    // Dried Fruits
    { tagId: driedFruitsTag.id, entityType: 'ingredient', entityId: driedApples.id },
    { tagId: driedFruitsTag.id, entityType: 'ingredient', entityId: driedApricots.id },
    { tagId: driedFruitsTag.id, entityType: 'ingredient', entityId: driedCherries.id },
    { tagId: driedFruitsTag.id, entityType: 'ingredient', entityId: raisins.id },
    { tagId: driedFruitsTag.id, entityType: 'ingredient', entityId: driedCranberries.id },

    // Spices
    { tagId: spicesTag.id, entityType: 'ingredient', entityId: seaSalt.id },
    { tagId: spicesTag.id, entityType: 'ingredient', entityId: pinkSeaSalt.id },
    { tagId: spicesTag.id, entityType: 'ingredient', entityId: cinnamon.id },
    { tagId: spicesTag.id, entityType: 'ingredient', entityId: nutmeg.id },
    { tagId: spicesTag.id, entityType: 'ingredient', entityId: cardamom.id },
    { tagId: spicesTag.id, entityType: 'ingredient', entityId: ginger.id },
    { tagId: spicesTag.id, entityType: 'ingredient', entityId: allspice.id },
    { tagId: spicesTag.id, entityType: 'ingredient', entityId: vanilla.id },
    { tagId: spicesTag.id, entityType: 'ingredient', entityId: cloves.id },
    { tagId: spicesTag.id, entityType: 'ingredient', entityId: blackPepper.id },
    { tagId: spicesTag.id, entityType: 'ingredient', entityId: turmeric.id },
    { tagId: spicesTag.id, entityType: 'ingredient', entityId: creamOfTartar.id },

    // Herbs & Seasonings
    { tagId: herbsSeasoningsTag.id, entityType: 'ingredient', entityId: freshRosemary.id },
    { tagId: herbsSeasoningsTag.id, entityType: 'ingredient', entityId: driedRosemary.id },
    { tagId: herbsSeasoningsTag.id, entityType: 'ingredient', entityId: sage.id },
    { tagId: herbsSeasoningsTag.id, entityType: 'ingredient', entityId: driedBasil.id },
    { tagId: herbsSeasoningsTag.id, entityType: 'ingredient', entityId: driedOregano.id },
    { tagId: herbsSeasoningsTag.id, entityType: 'ingredient', entityId: redPepperFlakes.id },
    { tagId: herbsSeasoningsTag.id, entityType: 'ingredient', entityId: garlicPowder.id },
    { tagId: herbsSeasoningsTag.id, entityType: 'ingredient', entityId: onionPowder.id },

    // Leavening
    { tagId: leaveningTag.id, entityType: 'ingredient', entityId: sourdoughCulture.id },
    { tagId: leaveningTag.id, entityType: 'ingredient', entityId: levain.id },
    { tagId: leaveningTag.id, entityType: 'ingredient', entityId: poolish.id },
    { tagId: leaveningTag.id, entityType: 'ingredient', entityId: instantYeast.id },
    { tagId: leaveningTag.id, entityType: 'ingredient', entityId: bakingSoda.id },
    { tagId: leaveningTag.id, entityType: 'ingredient', entityId: bakingPowder.id },

    // Oils
    { tagId: oilsTag.id, entityType: 'ingredient', entityId: oliveOil.id },

    // Citrus
    { tagId: citrusTag.id, entityType: 'ingredient', entityId: lemonZest.id },
    { tagId: citrusTag.id, entityType: 'ingredient', entityId: lemonJuice.id },
    { tagId: citrusTag.id, entityType: 'ingredient', entityId: orangeZest.id },

    // Specialty
    { tagId: specialtyTag.id, entityType: 'ingredient', entityId: butterflyPeaFlowers.id },
    { tagId: specialtyTag.id, entityType: 'ingredient', entityId: water.id },
  ];

  await prisma.entityTag.createMany({
    data: ingredientTagAssignments,
  });

  console.log(`✅ Created 1 tag type, 12 category tags, and ${ingredientTagAssignments.length} tag assignments\n`);

  // ==========================================================================
  // Create Equipment (for Daily Grains)
  // ==========================================================================
  console.log('🔧 Creating equipment...');

  await prisma.equipment.createMany({
    data: [
      {
        bakeryId: dailyGrains.id,
        name: 'Spiral Mixer (80L)',
        status: EquipmentStatus.IN_USE,
        purchaseDate: new Date('2023-01-15'),
        cost: 8500.00,
        quantity: 1,
        serialNumber: 'HB-2023-001',
        notes: 'Hobart HL800 - Primary dough mixer - handles up to 50kg flour',
      },
      {
        bakeryId: dailyGrains.id,
        name: 'Deck Oven (3-deck)',
        status: EquipmentStatus.IN_USE,
        purchaseDate: new Date('2022-06-10'),
        cost: 15000.00,
        quantity: 1,
        serialNumber: 'BL-2022-045',
        notes: 'Blodgett DeckMaster-3 - Steam injection capable - primary bread oven',
      },
      {
        bakeryId: dailyGrains.id,
        name: 'Proofing Cabinet (Full-size)',
        status: EquipmentStatus.IN_USE,
        purchaseDate: new Date('2023-03-20'),
        cost: 3200.00,
        quantity: 1,
        serialNumber: 'BP-2023-012',
        notes: 'Bakers Pride ProofMaster-2000',
      },
      {
        bakeryId: dailyGrains.id,
        name: 'Dough Sheeter',
        status: EquipmentStatus.IN_USE,
        purchaseDate: new Date('2021-11-05'),
        cost: 2800.00,
        quantity: 1,
        serialNumber: 'SM-2021-089',
        notes: 'Somerset CDR-2000',
      },
      {
        bakeryId: dailyGrains.id,
        name: 'Walk-in Refrigerator',
        status: EquipmentStatus.IN_USE,
        purchaseDate: new Date('2020-08-15'),
        cost: 12000.00,
        quantity: 1,
        serialNumber: 'KP-2020-034',
        notes: 'Kolpak WalkIn-1012 - 10ft x 12ft, temperature: 34-38°F',
      },
      {
        bakeryId: dailyGrains.id,
        name: 'Stand Mixer (20qt)',
        status: EquipmentStatus.MAINTENANCE,
        purchaseDate: new Date('2023-07-12'),
        cost: 1200.00,
        quantity: 1,
        serialNumber: 'KA-2023-067',
        notes: 'KitchenAid Commercial-20 - For cookie doughs and small batches',
      },
    ],
  });

  console.log(`✅ Created 6 pieces of equipment\n`);

  // ==========================================================================
  // Create Recipes (for Daily Grains) - Real recipes from Square menu
  // ==========================================================================
  console.log('📝 Creating recipes...');

  // Country Sourdough Recipe
  const countrySourdough = await prisma.recipe.create({
    data: {
      bakeryId: dailyGrains.id,
      name: 'Country Sourdough Bread',
      description: 'Our signature naturally leavened sourdough with a blend of heritage whole-grain flours.',
      yieldQty: 2,
      yieldUnit: 'loaves',
      totalCost: 0,
    },
  });

  await prisma.recipeSection.create({
    data: {
      recipeId: countrySourdough.id,
      name: 'Ingredients',
      order: 0,
      instructions: '# Country Sourdough\n\n## Autolyse\nMix bread flour, whole wheat flour blend, and water. Rest for 30-60 minutes.\n\n## Mix\nAdd sourdough culture and salt. Mix until well incorporated. Perform stretch and folds.\n\n## Bulk Fermentation\nLet dough rise for 4-6 hours at 75°F. Perform stretch and folds every 30 minutes for first 2 hours.\n\n## Shape & Proof\nDivide into two portions. Pre-shape, rest 20 minutes, then final shape. Refrigerate overnight (12-18 hours).\n\n## Bake\nPreheat oven to 475°F with Dutch oven inside. Score loaves. Bake covered for 20 minutes, then uncovered for 25 minutes.\n\n*Trace amounts of olive oil and rice flour used for prep.*',
      ingredients: {
        create: [
          { ingredientId: breadFlour.id, quantity: 800, unit: 'g' },
          { ingredientId: turkeyRedFlour.id, quantity: 200, unit: 'g' },
          { ingredientId: water.id, quantity: 750, unit: 'mL' },
          { ingredientId: sourdoughCulture.id, quantity: 200, unit: 'g' },
          { ingredientId: seaSalt.id, quantity: 22, unit: 'g' },
        ],
      },
    },
  });

  // Brown Butter Chocolate Chip Cookie
  const chocolateChipCookie = await prisma.recipe.create({
    data: {
      bakeryId: dailyGrains.id,
      name: 'Brown Butter Dark Chocolate Chip Cookie',
      description: 'Chewy cookies made with heritage whole wheat flour blend and brown butter.',
      yieldQty: 24,
      yieldUnit: 'cookies',
      totalCost: 0,
    },
  });

  await prisma.recipeSection.create({
    data: {
      recipeId: chocolateChipCookie.id,
      name: 'Ingredients',
      order: 0,
      instructions: '# Brown Butter Dark Chocolate Chip Cookies\n\n## Brown the Butter\nMelt butter in saucepan over medium heat until golden brown with nutty aroma. Cool slightly.\n\n## Mix Wet\nWhisk brown butter with sugars. Add eggs and vanilla.\n\n## Mix Dry\nCombine flour blend, baking soda, and salt.\n\n## Combine\nFold dry into wet. Add chocolate chips. Chill dough 24 hours for best results.\n\n## Bake\nScoop onto parchment-lined sheets. Bake at 350°F for 12-14 minutes until edges are set.',
      ingredients: {
        create: [
          { ingredientId: turkeyRedFlour.id, quantity: 150, unit: 'g' },
          { ingredientId: whiteSonoraFlour.id, quantity: 150, unit: 'g' },
          { ingredientId: butter.id, quantity: 230, unit: 'g' },
          { ingredientId: darkChocolateChips.id, quantity: 340, unit: 'g' },
          { ingredientId: brownSugar.id, quantity: 200, unit: 'g' },
          { ingredientId: caneS.id, quantity: 100, unit: 'g' },
          { ingredientId: eggs.id, quantity: 2, unit: 'unit' },
          { ingredientId: vanilla.id, quantity: 10, unit: 'mL' },
          { ingredientId: seaSalt.id, quantity: 8, unit: 'g' },
          { ingredientId: bakingSoda.id, quantity: 5, unit: 'g' },
        ],
      },
    },
  });

  // Brioche Cinnamon Roll
  const cinnamonRoll = await prisma.recipe.create({
    data: {
      bakeryId: dailyGrains.id,
      name: 'Brioche Cinnamon Roll',
      description: 'Rich brioche dough with cinnamon sugar filling and vanilla glaze.',
      yieldQty: 12,
      yieldUnit: 'rolls',
      totalCost: 0,
    },
  });

  await prisma.recipeSection.create({
    data: {
      recipeId: cinnamonRoll.id,
      name: 'Brioche Dough',
      order: 0,
      instructions: '# Brioche Dough\n\nCombine Rouge de Bordeaux flour, bread flour, milk, yeast, and sugar. Mix until smooth. Add eggs one at a time. Add softened butter gradually. Knead until smooth and elastic. Refrigerate overnight.',
      ingredients: {
        create: [
          { ingredientId: rougeFlour.id, quantity: 200, unit: 'g' },
          { ingredientId: breadFlour.id, quantity: 300, unit: 'g' },
          { ingredientId: milk.id, quantity: 120, unit: 'mL' },
          { ingredientId: butter.id, quantity: 170, unit: 'g' },
          { ingredientId: eggs.id, quantity: 4, unit: 'unit' },
          { ingredientId: caneS.id, quantity: 60, unit: 'g' },
          { ingredientId: instantYeast.id, quantity: 10, unit: 'g' },
          { ingredientId: seaSalt.id, quantity: 8, unit: 'g' },
        ],
      },
    },
  });

  await prisma.recipeSection.create({
    data: {
      recipeId: cinnamonRoll.id,
      name: 'Filling & Glaze',
      order: 1,
      instructions: '# Filling\nMix softened butter with brown sugar and cinnamon. Spread on rolled dough. Roll tightly and cut into 12 pieces.\n\n# Glaze\nWhisk powdered sugar with vanilla and milk until smooth.\n\n## Bake\nProof 1-2 hours until puffy. Bake at 350°F for 25-30 minutes. Drizzle with glaze while warm.',
      ingredients: {
        create: [
          { ingredientId: butter.id, quantity: 115, unit: 'g' },
          { ingredientId: brownSugar.id, quantity: 200, unit: 'g' },
          { ingredientId: cinnamon.id, quantity: 15, unit: 'g' },
          { ingredientId: powderedSugar.id, quantity: 200, unit: 'g' },
          { ingredientId: vanilla.id, quantity: 5, unit: 'mL' },
          { ingredientId: milk.id, quantity: 45, unit: 'mL' },
        ],
      },
    },
  });

  // Apricot Cherry Sourdough
  const apricotCherrySourdough = await prisma.recipe.create({
    data: {
      bakeryId: dailyGrains.id,
      name: 'Apricot Cherry Sourdough Bread',
      description: 'Einkorn sourdough studded with organic dried apricots and cherries, with a hint of lemon.',
      yieldQty: 2,
      yieldUnit: 'loaves',
      totalCost: 0,
    },
  });

  await prisma.recipeSection.create({
    data: {
      recipeId: apricotCherrySourdough.id,
      name: 'Ingredients',
      order: 0,
      instructions: '# Apricot Cherry Sourdough\n\nFollow standard sourdough method. Add chopped dried fruit during final fold. The lemon zest brightens the sweetness of the fruit.\n\n*Trace amounts of olive oil and rice flour for prep.*',
      ingredients: {
        create: [
          { ingredientId: einkornFlour.id, quantity: 300, unit: 'g' },
          { ingredientId: breadFlour.id, quantity: 700, unit: 'g' },
          { ingredientId: sourdoughCulture.id, quantity: 200, unit: 'g' },
          { ingredientId: driedApricots.id, quantity: 100, unit: 'g' },
          { ingredientId: driedCherries.id, quantity: 100, unit: 'g' },
          { ingredientId: seaSalt.id, quantity: 20, unit: 'g' },
          { ingredientId: lemonZest.id, quantity: 5, unit: 'g' },
          { ingredientId: water.id, quantity: 700, unit: 'mL' },
        ],
      },
    },
  });

  // Oatmeal Cookie
  const oatmealCookie = await prisma.recipe.create({
    data: {
      bakeryId: dailyGrains.id,
      name: 'Oatmeal Cookie',
      description: 'Classic oatmeal cookies with thick rolled oats and White Sonora whole wheat.',
      yieldQty: 36,
      yieldUnit: 'cookies',
      totalCost: 0,
    },
  });

  await prisma.recipeSection.create({
    data: {
      recipeId: oatmealCookie.id,
      name: 'Ingredients',
      order: 0,
      instructions: '# Oatmeal Cookies\n\n## Cream\nBeat butter and sugars until fluffy. Add egg.\n\n## Mix Dry\nCombine flour, oats, baking soda, salt, and cinnamon.\n\n## Combine\nFold dry into wet.\n\n## Bake\nScoop onto sheets. Bake at 350°F for 10-12 minutes.',
      ingredients: {
        create: [
          { ingredientId: thickRolledOats.id, quantity: 300, unit: 'g' },
          { ingredientId: butter.id, quantity: 230, unit: 'g' },
          { ingredientId: brownSugar.id, quantity: 150, unit: 'g' },
          { ingredientId: whiteSonoraFlour.id, quantity: 190, unit: 'g' },
          { ingredientId: eggs.id, quantity: 1, unit: 'unit' },
          { ingredientId: caneS.id, quantity: 100, unit: 'g' },
          { ingredientId: bakingSoda.id, quantity: 5, unit: 'g' },
          { ingredientId: seaSalt.id, quantity: 3, unit: 'g' },
          { ingredientId: cinnamon.id, quantity: 5, unit: 'g' },
        ],
      },
    },
  });

  console.log(`✅ Created 5 recipes with sections\n`);

  // ==========================================================================
  // Create Inventory with Lots (FIFO system)
  // ==========================================================================
  console.log('📦 Creating inventory with lots...');

  // Create inventory for key ingredients
  const inventoryItems = [
    { ingredient: breadFlour, qty: 200, unit: 'lb', cost: 0.85, vendor: organicFlourVendor },
    { ingredient: whiteSonoraFlour, qty: 50, unit: 'lb', cost: 2.50, vendor: flourVendor },
    { ingredient: turkeyRedFlour, qty: 50, unit: 'lb', cost: 2.50, vendor: flourVendor },
    { ingredient: einkornFlour, qty: 25, unit: 'lb', cost: 4.00, vendor: flourVendor },
    { ingredient: rougeFlour, qty: 25, unit: 'lb', cost: 2.75, vendor: flourVendor },
    { ingredient: butter, qty: 40, unit: 'lb', cost: 5.50, vendor: dairyVendor },
    { ingredient: eggs, qty: 30, unit: 'dozen', cost: 4.50, vendor: dairyVendor },
    { ingredient: milk, qty: 10, unit: 'gal', cost: 6.00, vendor: dairyVendor },
    { ingredient: darkChocolateChips, qty: 25, unit: 'lb', cost: 8.00, vendor: chocolateVendor },
    { ingredient: thickRolledOats, qty: 50, unit: 'lb', cost: 1.50, vendor: dryGoodsVendor },
    { ingredient: brownSugar, qty: 50, unit: 'lb', cost: 0.90, vendor: dryGoodsVendor },
    { ingredient: caneS, qty: 50, unit: 'lb', cost: 0.75, vendor: dryGoodsVendor },
    { ingredient: seaSalt, qty: 25, unit: 'lb', cost: 0.60, vendor: dryGoodsVendor },
    { ingredient: cinnamon, qty: 32, unit: 'oz', cost: 0.50, vendor: dryGoodsVendor },
    { ingredient: sourdoughCulture, qty: 10, unit: 'lb', cost: 0.00, vendor: null },
    { ingredient: driedCherries, qty: 10, unit: 'lb', cost: 12.00, vendor: dryGoodsVendor },
    { ingredient: driedApricots, qty: 10, unit: 'lb', cost: 10.00, vendor: dryGoodsVendor },
    { ingredient: pecans, qty: 10, unit: 'lb', cost: 14.00, vendor: dryGoodsVendor },
    { ingredient: instantYeast, qty: 5, unit: 'lb', cost: 6.00, vendor: dryGoodsVendor },
  ];

  for (const item of inventoryItems) {
    await prisma.inventory.create({
      data: {
        bakeryId: dailyGrains.id,
        ingredientId: item.ingredient.id,
        displayUnit: item.unit,
        lots: {
          create: [
            {
              purchaseQty: item.qty,
              remainingQty: item.qty,
              purchaseUnit: item.unit,
              costPerUnit: item.cost,
              purchasedAt: new Date('2026-01-15'),
              vendorId: item.vendor?.id,
              notes: 'Initial inventory',
            },
          ],
        },
      },
    });
  }

  console.log(`✅ Created ${inventoryItems.length} inventory records with lots\n`);

  // ==========================================================================
  // Create Production Sheets
  // ==========================================================================
  console.log('🥖 Creating production sheets...');

  await prisma.productionSheet.create({
    data: {
      bakeryId: dailyGrains.id,
      description: 'Morning sourdough batch',
      scheduledFor: new Date('2026-01-31T06:00:00'),
      completed: true,
      completedAt: new Date('2026-01-31T14:30:00'),
      completedBy: dailyGrainsBaker.id,
      notes: 'Completed successfully',
      recipes: {
        create: [
          {
            recipeId: countrySourdough.id,
            scale: 10,
            order: 0,
          },
        ],
      },
    },
  });

  await prisma.productionSheet.create({
    data: {
      bakeryId: dailyGrains.id,
      description: 'Weekend cookie production',
      scheduledFor: new Date('2026-02-02T08:00:00'),
      completed: false,
      notes: 'Need to check chocolate chip inventory',
      recipes: {
        create: [
          {
            recipeId: chocolateChipCookie.id,
            scale: 4,
            order: 0,
          },
        ],
      },
    },
  });

  await prisma.productionSheet.create({
    data: {
      bakeryId: dailyGrains.id,
      description: 'Sunday morning bake',
      scheduledFor: new Date('2026-02-03T05:00:00'),
      completed: false,
      notes: 'Cinnamon rolls and bread for Sunday market',
      recipes: {
        create: [
          {
            recipeId: cinnamonRoll.id,
            scale: 3,
            order: 0,
          },
          {
            recipeId: countrySourdough.id,
            scale: 5,
            order: 1,
          },
        ],
      },
    },
  });

  console.log(`✅ Created 3 production sheets\n`);

  // ==========================================================================
  // Summary
  // ==========================================================================
  console.log('\n🎉 Database seed completed successfully!\n');
  console.log('Summary:');
  console.log('--------');
  console.log(`✅ Bakeries: 3`);
  console.log(`✅ Roles: 3`);
  console.log(`✅ Users: 4 demo + your account as platform admin`);
  console.log(`✅ Vendors: 5`);
  console.log(`✅ Ingredients: 85`);
  console.log(`✅ Tag Types: 4`);
  console.log(`✅ Tags: 12`);
  console.log(`✅ Tag Assignments: ${ingredientTagAssignments.length}`);
  console.log(`✅ Equipment: 6`);
  console.log(`✅ Recipes: 5`);
  console.log(`✅ Unit Conversions: 16`);
  console.log(`✅ Inventory Records: ${inventoryItems.length}`);
  console.log(`✅ Production Sheets: 3`);
  console.log('\n📧 Login Credentials (Development Only):');
  console.log('----------------------------------------');
  console.log('Platform Admin: paul@dailygrains.co (auto-configured)');
  console.log('Daily Grains Owner: owner@dailygrains.co');
  console.log('Daily Grains Manager: manager@dailygrains.co');
  console.log('Daily Grains Baker: baker@dailygrains.co');
  console.log('Sweet Treats Owner: owner@sweettreats.com');
  console.log('\n💡 Note: Demo accounts are for development/testing only.\n');
}

main()
  .catch((e) => {
    console.error('❌ Seed failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
