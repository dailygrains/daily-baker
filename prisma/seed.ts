/* eslint-disable @typescript-eslint/no-unused-vars */
import { PrismaClient, EquipmentStatus, TransactionType } from '../src/generated/prisma';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Starting database seed...\n');

  // Clean existing data in development
  if (process.env.NODE_ENV === 'development') {
    console.log('🗑️  Cleaning existing data...');
    await prisma.bakeSheet.deleteMany();
    await prisma.inventoryTransaction.deleteMany();
    await prisma.recipeSectionIngredient.deleteMany();
    await prisma.recipeSection.deleteMany();
    await prisma.recipe.deleteMany();
    await prisma.ingredient.deleteMany();
    await prisma.unitConversion.deleteMany();
    await prisma.vendorContact.deleteMany();
    await prisma.vendor.deleteMany();
    await prisma.equipment.deleteMany();
    await prisma.user.deleteMany();
    await prisma.role.deleteMany();
    await prisma.bakery.deleteMany();
    console.log('✅ Cleanup complete\n');
  }

  // ==========================================================================
  // Create Bakeries
  // ==========================================================================
  console.log('🏪 Creating bakeries...');

  const artisanBakery = await prisma.bakery.create({
    data: {
      name: 'Artisan Sourdough Co.',
      slug: 'artisan-sourdough',
      address: '123 Main Street, Portland, OR 97201',
      phone: '(503) 555-0100',
      email: 'hello@artisansourdough.com',
      website: 'https://artisansourdough.com',
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

  console.log(`✅ Created ${3} bakeries\n`);

  // ==========================================================================
  // Create Roles
  // ==========================================================================
  console.log('👔 Creating roles...');

  const artisanOwnerRole = await prisma.role.create({
    data: {
      bakeryId: artisanBakery.id,
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

  const artisanManagerRole = await prisma.role.create({
    data: {
      bakeryId: artisanBakery.id,
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

  const artisanBakerRole = await prisma.role.create({
    data: {
      bakeryId: artisanBakery.id,
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

  const sweetTreatsOwnerRole = await prisma.role.create({
    data: {
      bakeryId: sweetTreats.id,
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

  console.log(`✅ Created ${4} roles\n`);

  // ==========================================================================
  // Create Users
  // ==========================================================================
  console.log('👥 Creating users...');

  // Platform Admin (no bakery association)
  const _platformAdmin = await prisma.user.create({
    data: {
      clerkId: 'user_platform_admin',
      email: process.env.PLATFORM_ADMIN_EMAIL || 'admin@dailybaker.com',
      name: 'Platform Admin',
      isPlatformAdmin: true,
      lastLoginAt: new Date(),
    },
  });

  // Artisan Sourdough Users
  const _artisanOwner = await prisma.user.create({
    data: {
      clerkId: 'user_artisan_owner',
      email: 'owner@artisansourdough.com',
      name: 'Sarah Johnson',
      roleId: artisanOwnerRole.id,
      isPlatformAdmin: false,
      lastLoginAt: new Date(),
      bakeries: {
        create: {
          bakeryId: artisanBakery.id,
        },
      },
    },
  });

  const artisanManager = await prisma.user.create({
    data: {
      clerkId: 'user_artisan_manager',
      email: 'manager@artisansourdough.com',
      name: 'Michael Chen',
      roleId: artisanManagerRole.id,
      isPlatformAdmin: false,
      lastLoginAt: new Date(),
      bakeries: {
        create: {
          bakeryId: artisanBakery.id,
        },
      },
    },
  });

  const artisanBaker = await prisma.user.create({
    data: {
      clerkId: 'user_artisan_baker',
      email: 'baker@artisansourdough.com',
      name: 'Emma Rodriguez',
      roleId: artisanBakerRole.id,
      isPlatformAdmin: false,
      lastLoginAt: new Date(),
      bakeries: {
        create: {
          bakeryId: artisanBakery.id,
        },
      },
    },
  });

  // Sweet Treats Users
  const _sweetTreatsOwner = await prisma.user.create({
    data: {
      clerkId: 'user_sweetreats_owner',
      email: 'owner@sweettreats.com',
      name: 'David Martinez',
      roleId: sweetTreatsOwnerRole.id,
      isPlatformAdmin: false,
      lastLoginAt: new Date(),
      bakeries: {
        create: {
          bakeryId: sweetTreats.id,
        },
      },
    },
  });

  console.log(`✅ Created ${5} users\n`);

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

  console.log(`✅ Created ${14} unit conversions\n`);

  // ==========================================================================
  // Create Vendors (for Artisan Sourdough)
  // ==========================================================================
  console.log('🚚 Creating vendors...');

  const flourVendor = await prisma.vendor.create({
    data: {
      bakeryId: artisanBakery.id,
      name: 'Northwest Grain Suppliers',
      email: 'orders@nwgrain.com',
      phone: '(503) 555-1000',
      website: 'https://nwgrain.com',
      notes: 'Primary flour supplier - organic and conventional',
      contacts: {
        create: [
          {
            name: 'Tom Williams',
            title: 'Sales Representative',
            email: 'tom@nwgrain.com',
            phone: '(503) 555-1001',
          },
        ],
      },
    },
  });

  const dairyVendor = await prisma.vendor.create({
    data: {
      bakeryId: artisanBakery.id,
      name: 'Valley Fresh Dairy',
      email: 'orders@valleydairy.com',
      phone: '(503) 555-2000',
      website: 'https://valleydairy.com',
      notes: 'Organic butter and milk',
      contacts: {
        create: [
          {
            name: 'Lisa Anderson',
            title: 'Account Manager',
            email: 'lisa@valleydairy.com',
            phone: '(503) 555-2001',
          },
        ],
      },
    },
  });

  console.log(`✅ Created ${2} vendors\n`);

  // ==========================================================================
  // Create Ingredients (for Artisan Sourdough)
  // ==========================================================================
  console.log('🧪 Creating ingredients...');

  const breadFlour = await prisma.ingredient.create({
    data: {
      bakeryId: artisanBakery.id,
      name: 'Bread Flour (Organic)',
      currentQty: 250,
      unit: 'kg',
      costPerUnit: 2.50,
      vendorId: flourVendor.id,
    },
  });

  const wholeWheatFlour = await prisma.ingredient.create({
    data: {
      bakeryId: artisanBakery.id,
      name: 'Whole Wheat Flour',
      currentQty: 100,
      unit: 'kg',
      costPerUnit: 3.00,
      vendorId: flourVendor.id,
    },
  });

  const _ryeFlour = await prisma.ingredient.create({
    data: {
      bakeryId: artisanBakery.id,
      name: 'Rye Flour',
      currentQty: 50,
      unit: 'kg',
      costPerUnit: 3.50,
      vendorId: flourVendor.id,
    },
  });

  const salt = await prisma.ingredient.create({
    data: {
      bakeryId: artisanBakery.id,
      name: 'Sea Salt',
      currentQty: 20,
      unit: 'kg',
      costPerUnit: 8.00,
      vendorId: flourVendor.id,
    },
  });

  const water = await prisma.ingredient.create({
    data: {
      bakeryId: artisanBakery.id,
      name: 'Filtered Water',
      currentQty: 500,
      unit: 'L',
      costPerUnit: 0.01,
    },
  });

  const yeast = await prisma.ingredient.create({
    data: {
      bakeryId: artisanBakery.id,
      name: 'Active Dry Yeast',
      currentQty: 5,
      unit: 'kg',
      costPerUnit: 15.00,
      vendorId: flourVendor.id,
    },
  });

  const butter = await prisma.ingredient.create({
    data: {
      bakeryId: artisanBakery.id,
      name: 'Unsalted Butter (Organic)',
      currentQty: 30,
      unit: 'kg',
      costPerUnit: 12.00,
      vendorId: dairyVendor.id,
    },
  });

  const milk = await prisma.ingredient.create({
    data: {
      bakeryId: artisanBakery.id,
      name: 'Whole Milk',
      currentQty: 40,
      unit: 'L',
      costPerUnit: 2.00,
      vendorId: dairyVendor.id,
    },
  });

  const eggs = await prisma.ingredient.create({
    data: {
      bakeryId: artisanBakery.id,
      name: 'Large Eggs (Organic)',
      currentQty: 600,
      unit: 'unit',
      costPerUnit: 0.50,
      vendorId: dairyVendor.id,
    },
  });

  const sugar = await prisma.ingredient.create({
    data: {
      bakeryId: artisanBakery.id,
      name: 'Granulated Sugar',
      currentQty: 75,
      unit: 'kg',
      costPerUnit: 2.00,
      vendorId: flourVendor.id,
    },
  });

  console.log(`✅ Created ${10} ingredients\n`);

  // ==========================================================================
  // Create Equipment (for Artisan Sourdough)
  // ==========================================================================
  console.log('🔧 Creating equipment...');

  await prisma.equipment.createMany({
    data: [
      {
        bakeryId: artisanBakery.id,
        name: 'Spiral Mixer (80L)',
        status: EquipmentStatus.IN_USE,
        purchaseDate: new Date('2023-01-15'),
        cost: 8500.00,
        quantity: 1,
        serialNumber: 'HB-2023-001',
        notes: 'Hobart HL800 - Primary dough mixer - handles up to 50kg flour',
      },
      {
        bakeryId: artisanBakery.id,
        name: 'Deck Oven (3-deck)',
        status: EquipmentStatus.IN_USE,
        purchaseDate: new Date('2022-06-10'),
        cost: 15000.00,
        quantity: 1,
        serialNumber: 'BL-2022-045',
        notes: 'Blodgett DeckMaster-3 - Steam injection capable - primary bread oven',
      },
      {
        bakeryId: artisanBakery.id,
        name: 'Proofing Cabinet (Full-size)',
        status: EquipmentStatus.IN_USE,
        purchaseDate: new Date('2023-03-20'),
        cost: 3200.00,
        quantity: 1,
        serialNumber: 'BP-2023-012',
        notes: 'Bakers Pride ProofMaster-2000',
      },
      {
        bakeryId: artisanBakery.id,
        name: 'Dough Sheeter',
        status: EquipmentStatus.IN_USE,
        purchaseDate: new Date('2021-11-05'),
        cost: 2800.00,
        quantity: 1,
        serialNumber: 'SM-2021-089',
        notes: 'Somerset CDR-2000',
      },
      {
        bakeryId: artisanBakery.id,
        name: 'Walk-in Refrigerator',
        status: EquipmentStatus.IN_USE,
        purchaseDate: new Date('2020-08-15'),
        cost: 12000.00,
        quantity: 1,
        serialNumber: 'KP-2020-034',
        notes: 'Kolpak WalkIn-1012 - 10ft x 12ft, temperature: 34-38°F',
      },
      {
        bakeryId: artisanBakery.id,
        name: 'Stand Mixer (20qt)',
        status: EquipmentStatus.MAINTENANCE,
        purchaseDate: new Date('2023-07-12'),
        cost: 1200.00,
        quantity: 1,
        serialNumber: 'KA-2023-067',
        notes: 'KitchenAid Commercial-20 - Motor needs replacement - scheduled for next week',
      },
    ],
  });

  console.log(`✅ Created ${6} pieces of equipment\n`);

  // ==========================================================================
  // Create Recipes (for Artisan Sourdough)
  // ==========================================================================
  console.log('📝 Creating recipes...');

  // Classic Sourdough Recipe
  const sourdoughRecipe = await prisma.recipe.create({
    data: {
      bakeryId: artisanBakery.id,
      name: 'Classic Sourdough Bread',
      description: 'Our signature naturally leavened sourdough bread with a crispy crust and open crumb structure.',
      yield: '2 loaves',
      totalCost: 0,
    },
  });

  // Create recipe sections and ingredients for Sourdough
  const _levainSection = await prisma.recipeSection.create({
    data: {
      recipeId: sourdoughRecipe.id,
      name: 'Levain (Sourdough Starter)',
      order: 0,
      instructions: '# Levain\n\nMix sourdough starter with flour and water. Let ferment overnight at room temperature until bubbly and doubled in size.',
      ingredients: {
        create: [
          {
            ingredientId: breadFlour.id,
            quantity: 100,
            unit: 'g',
          },
          {
            ingredientId: water.id,
            quantity: 100,
            unit: 'mL',
          },
        ],
      },
    },
  });

  const _doughSection = await prisma.recipeSection.create({
    data: {
      recipeId: sourdoughRecipe.id,
      name: 'Main Dough',
      order: 1,
      instructions: '# Main Dough\n\n## Autolyse\nMix bread flour and water. Rest for 30-60 minutes.\n\n## Mix\nAdd levain and salt. Mix until well incorporated. Perform stretch and folds.\n\n## Bulk Fermentation\nLet dough rise for 4-6 hours at 75°F. Perform stretch and folds every 30 minutes for first 2 hours.\n\n## Shape & Proof\nDivide into two portions. Pre-shape, rest 20 minutes, then final shape. Refrigerate overnight (12-18 hours) or proof at room temp for 3-4 hours.\n\n## Bake\nPreheat oven to 475°F with Dutch oven inside. Score loaves. Bake covered for 20 minutes, then uncovered for 25 minutes until deep golden.',
      ingredients: {
        create: [
          {
            ingredientId: breadFlour.id,
            quantity: 900,
            unit: 'g',
          },
          {
            ingredientId: water.id,
            quantity: 630,
            unit: 'mL',
          },
          {
            ingredientId: salt.id,
            quantity: 20,
            unit: 'g',
          },
        ],
      },
    },
  });

  // Whole Wheat Bread Recipe
  const wholeWheatRecipe = await prisma.recipe.create({
    data: {
      bakeryId: artisanBakery.id,
      name: 'Honey Whole Wheat Bread',
      description: 'Hearty whole wheat bread with a touch of honey for natural sweetness.',
      yield: '2 loaves',
      totalCost: 0,
    },
  });

  await prisma.recipeSection.create({
    data: {
      recipeId: wholeWheatRecipe.id,
      name: 'Ingredients',
      order: 0,
      instructions: '# Honey Whole Wheat Bread\n\n## Mixing\nCombine warm water and yeast, let proof 5 minutes. Add honey, salt, and butter. Mix in whole wheat flour and bread flour. Knead for 10 minutes until smooth.\n\n## First Rise\nPlace in oiled bowl. Cover and let rise 60 minutes.\n\n## Shape and Second Rise\nDivide into two loaves. Shape and place in greased pans. Let rise 45 minutes.\n\n## Bake\nPreheat oven to 350°F. Bake 40 minutes until golden. Internal temp should reach 190°F.',
      ingredients: {
        create: [
          {
            ingredientId: wholeWheatFlour.id,
            quantity: 600,
            unit: 'g',
          },
          {
            ingredientId: breadFlour.id,
            quantity: 400,
            unit: 'g',
          },
          {
            ingredientId: water.id,
            quantity: 650,
            unit: 'mL',
          },
          {
            ingredientId: yeast.id,
            quantity: 14,
            unit: 'g',
          },
          {
            ingredientId: salt.id,
            quantity: 18,
            unit: 'g',
          },
          {
            ingredientId: butter.id,
            quantity: 50,
            unit: 'g',
          },
          {
            ingredientId: sugar.id,
            quantity: 75,
            unit: 'g',
          },
        ],
      },
    },
  });

  // Croissant Recipe
  const croissantRecipe = await prisma.recipe.create({
    data: {
      bakeryId: artisanBakery.id,
      name: 'Butter Croissants',
      description: 'Flaky, buttery croissants with hundreds of delicate layers.',
      yield: '24 croissants',
      totalCost: 0,
    },
  });

  await prisma.recipeSection.create({
    data: {
      recipeId: croissantRecipe.id,
      name: 'Dough',
      order: 0,
      instructions: '# Day 1: Dough\n\nMake dough with flour, milk, yeast, sugar, salt. Refrigerate overnight.',
      ingredients: {
        create: [
          {
            ingredientId: breadFlour.id,
            quantity: 1000,
            unit: 'g',
          },
          {
            ingredientId: milk.id,
            quantity: 500,
            unit: 'mL',
          },
          {
            ingredientId: yeast.id,
            quantity: 20,
            unit: 'g',
          },
          {
            ingredientId: sugar.id,
            quantity: 100,
            unit: 'g',
          },
          {
            ingredientId: salt.id,
            quantity: 20,
            unit: 'g',
          },
          {
            ingredientId: butter.id,
            quantity: 100,
            unit: 'g',
          },
        ],
      },
    },
  });

  await prisma.recipeSection.create({
    data: {
      recipeId: croissantRecipe.id,
      name: 'Butter Block (for lamination)',
      order: 1,
      instructions: '# Day 2: Lamination\n\nRoll out butter block. Encase butter in dough. Perform 3 sets of letter folds. Rest between folds.',
      ingredients: {
        create: [
          {
            ingredientId: butter.id,
            quantity: 600,
            unit: 'g',
          },
        ],
      },
    },
  });

  await prisma.recipeSection.create({
    data: {
      recipeId: croissantRecipe.id,
      name: 'Egg Wash',
      order: 2,
      instructions: '# Shaping and Baking\n\nRoll dough to 5mm thickness. Cut triangles. Roll from wide end to point. Curve into crescent shape. Proof 2-3 hours until puffy. Egg wash. Bake at 375°F for 20 minutes until golden.',
      ingredients: {
        create: [
          {
            ingredientId: eggs.id,
            quantity: 2,
            unit: 'unit',
          },
          {
            ingredientId: milk.id,
            quantity: 50,
            unit: 'mL',
          },
        ],
      },
    },
  });

  console.log(`✅ Created ${3} recipes with sections\n`);

  // ==========================================================================
  // Create Inventory Transactions
  // ==========================================================================
  console.log('📦 Creating inventory transactions...');

  // Simulate receiving orders
  await prisma.inventoryTransaction.create({
    data: {
      ingredientId: breadFlour.id,
      type: TransactionType.RECEIVE,
      quantity: 250,
      unit: 'kg',
      notes: 'Weekly flour delivery from Northwest Grain',
      createdBy: artisanManager.id,
    },
  });

  await prisma.inventoryTransaction.create({
    data: {
      ingredientId: butter.id,
      type: TransactionType.RECEIVE,
      quantity: 30,
      unit: 'kg',
      notes: 'Monthly butter order from Valley Fresh Dairy',
      createdBy: artisanManager.id,
    },
  });

  // Simulate usage from production
  await prisma.inventoryTransaction.create({
    data: {
      ingredientId: breadFlour.id,
      type: TransactionType.USE,
      quantity: 50,
      unit: 'kg',
      notes: 'Used in sourdough production - Week 1',
      createdBy: artisanBaker.id,
    },
  });

  // Simulate waste/adjustment
  await prisma.inventoryTransaction.create({
    data: {
      ingredientId: wholeWheatFlour.id,
      type: TransactionType.ADJUST,
      quantity: -5,
      unit: 'kg',
      notes: 'Inventory count adjustment - damaged bag',
      createdBy: artisanManager.id,
    },
  });

  console.log(`✅ Created ${4} inventory transactions\n`);

  // ==========================================================================
  // Create Bake Sheets
  // ==========================================================================
  console.log('🥖 Creating bake sheets...');

  // Completed bake sheet
  await prisma.bakeSheet.create({
    data: {
      recipeId: sourdoughRecipe.id,
      bakeryId: artisanBakery.id,
      scale: 25,
      quantity: '50 loaves',
      completed: true,
      completedAt: new Date('2025-01-16T14:30:00'),
      completedBy: artisanBaker.id,
      notes: 'Morning production batch',
    },
  });

  // In-progress bake sheet
  await prisma.bakeSheet.create({
    data: {
      recipeId: wholeWheatRecipe.id,
      bakeryId: artisanBakery.id,
      scale: 15,
      quantity: '30 loaves',
      completed: false,
      notes: 'Today\'s whole wheat production',
    },
  });

  // Scheduled bake sheet
  await prisma.bakeSheet.create({
    data: {
      recipeId: croissantRecipe.id,
      bakeryId: artisanBakery.id,
      scale: 4.17,
      quantity: '100 croissants',
      completed: false,
      notes: 'Weekend pastry production',
    },
  });

  console.log(`✅ Created ${3} bake sheets\n`);

  // ==========================================================================
  // Summary
  // ==========================================================================
  console.log('\n🎉 Database seed completed successfully!\n');
  console.log('Summary:');
  console.log('--------');
  console.log(`✅ Bakeries: 3`);
  console.log(`✅ Roles: 4`);
  console.log(`✅ Users: 5 (including 1 platform admin)`);
  console.log(`✅ Vendors: 2`);
  console.log(`✅ Vendor Contacts: 2`);
  console.log(`✅ Ingredients: 10`);
  console.log(`✅ Equipment: 6`);
  console.log(`✅ Recipes: 3`);
  console.log(`✅ Recipe Sections: 5`);
  console.log(`✅ Unit Conversions: 14`);
  console.log(`✅ Inventory Transactions: 4`);
  console.log(`✅ Bake Sheets: 3`);
  console.log('\n📧 Login Credentials (Development Only):');
  console.log('----------------------------------------');
  console.log('Platform Admin: admin@dailybaker.com');
  console.log('Artisan Owner: owner@artisansourdough.com');
  console.log('Artisan Manager: manager@artisansourdough.com');
  console.log('Artisan Baker: baker@artisansourdough.com');
  console.log('Sweet Treats Owner: owner@sweettreats.com');
  console.log('\n💡 Note: These are demo accounts for development/testing only.');
  console.log('In production, users will sign up via Clerk authentication.\n');
}

main()
  .catch((e) => {
    console.error('❌ Seed failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
