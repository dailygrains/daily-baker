import { PrismaClient, EquipmentStatus, TransactionType } from '@/generated/prisma';
import { hash } from 'bcryptjs';

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
      address: '123 Main Street',
      city: 'Portland',
      state: 'OR',
      zipCode: '97201',
      country: 'USA',
      phone: '(503) 555-0100',
      email: 'hello@artisansourdough.com',
      website: 'https://artisansourdough.com',
      timezone: 'America/Los_Angeles',
      isActive: true,
    },
  });

  const sweetTreats = await prisma.bakery.create({
    data: {
      name: 'Sweet Treats Pastry Shop',
      slug: 'sweet-treats',
      address: '456 Oak Avenue',
      city: 'Austin',
      state: 'TX',
      zipCode: '78701',
      country: 'USA',
      phone: '(512) 555-0200',
      email: 'info@sweettreats.com',
      website: 'https://sweettreats.com',
      timezone: 'America/Chicago',
      isActive: true,
    },
  });

  const rusticLoaves = await prisma.bakery.create({
    data: {
      name: 'Rustic Loaves Bakery',
      slug: 'rustic-loaves',
      address: '789 Elm Boulevard',
      city: 'Brooklyn',
      state: 'NY',
      zipCode: '11201',
      country: 'USA',
      phone: '(718) 555-0300',
      email: 'contact@rusticloaves.com',
      website: 'https://rusticloaves.com',
      timezone: 'America/New_York',
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
  const platformAdmin = await prisma.user.create({
    data: {
      clerkId: 'user_platform_admin',
      email: process.env.PLATFORM_ADMIN_EMAIL || 'admin@dailybaker.com',
      name: 'Platform Admin',
      isPlatformAdmin: true,
      lastLoginAt: new Date(),
    },
  });

  // Artisan Sourdough Users
  const artisanOwner = await prisma.user.create({
    data: {
      clerkId: 'user_artisan_owner',
      email: 'owner@artisansourdough.com',
      name: 'Sarah Johnson',
      bakeryId: artisanBakery.id,
      roleId: artisanOwnerRole.id,
      isPlatformAdmin: false,
      lastLoginAt: new Date(),
    },
  });

  const artisanManager = await prisma.user.create({
    data: {
      clerkId: 'user_artisan_manager',
      email: 'manager@artisansourdough.com',
      name: 'Michael Chen',
      bakeryId: artisanBakery.id,
      roleId: artisanManagerRole.id,
      isPlatformAdmin: false,
      lastLoginAt: new Date(),
    },
  });

  const artisanBaker = await prisma.user.create({
    data: {
      clerkId: 'user_artisan_baker',
      email: 'baker@artisansourdough.com',
      name: 'Emma Rodriguez',
      bakeryId: artisanBakery.id,
      roleId: artisanBakerRole.id,
      isPlatformAdmin: false,
      lastLoginAt: new Date(),
    },
  });

  // Sweet Treats Users
  const sweetTreatsOwner = await prisma.user.create({
    data: {
      clerkId: 'user_sweetreats_owner',
      email: 'owner@sweettreats.com',
      name: 'David Martinez',
      bakeryId: sweetTreats.id,
      roleId: sweetTreatsOwnerRole.id,
      isPlatformAdmin: false,
      lastLoginAt: new Date(),
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
      { fromUnit: 'kg', toUnit: 'g', factor: 1000 },
      { fromUnit: 'g', toUnit: 'kg', factor: 0.001 },
      { fromUnit: 'lb', toUnit: 'oz', factor: 16 },
      { fromUnit: 'oz', toUnit: 'lb', factor: 0.0625 },
      { fromUnit: 'kg', toUnit: 'lb', factor: 2.20462 },
      { fromUnit: 'lb', toUnit: 'kg', factor: 0.453592 },

      // Volume conversions
      { fromUnit: 'L', toUnit: 'mL', factor: 1000 },
      { fromUnit: 'mL', toUnit: 'L', factor: 0.001 },
      { fromUnit: 'gal', toUnit: 'qt', factor: 4 },
      { fromUnit: 'qt', toUnit: 'gal', factor: 0.25 },
      { fromUnit: 'cup', toUnit: 'mL', factor: 236.588 },
      { fromUnit: 'mL', toUnit: 'cup', factor: 0.00422675 },
      { fromUnit: 'tbsp', toUnit: 'mL', factor: 14.7868 },
      { fromUnit: 'tsp', toUnit: 'mL', factor: 4.92892 },
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
      type: 'Ingredients',
      email: 'orders@nwgrain.com',
      phone: '(503) 555-1000',
      address: '1000 Warehouse Road',
      city: 'Portland',
      state: 'OR',
      zipCode: '97210',
      website: 'https://nwgrain.com',
      notes: 'Primary flour supplier - organic and conventional',
      isActive: true,
      contacts: {
        create: [
          {
            name: 'Tom Williams',
            title: 'Sales Representative',
            email: 'tom@nwgrain.com',
            phone: '(503) 555-1001',
            isPrimary: true,
          },
        ],
      },
    },
  });

  const dairyVendor = await prisma.vendor.create({
    data: {
      bakeryId: artisanBakery.id,
      name: 'Valley Fresh Dairy',
      type: 'Dairy',
      email: 'orders@valleydairy.com',
      phone: '(503) 555-2000',
      address: '500 Farm Lane',
      city: 'Eugene',
      state: 'OR',
      zipCode: '97401',
      website: 'https://valleydairy.com',
      notes: 'Organic butter and milk',
      isActive: true,
      contacts: {
        create: [
          {
            name: 'Lisa Anderson',
            title: 'Account Manager',
            email: 'lisa@valleydairy.com',
            phone: '(503) 555-2001',
            isPrimary: true,
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
      category: 'Flour',
      currentQuantity: 250,
      unit: 'kg',
      minQuantity: 50,
      maxQuantity: 500,
      cost: 2.50,
      costUnit: 'kg',
      vendorId: flourVendor.id,
      notes: 'High-protein organic bread flour',
    },
  });

  const wholeWheatFlour = await prisma.ingredient.create({
    data: {
      bakeryId: artisanBakery.id,
      name: 'Whole Wheat Flour',
      category: 'Flour',
      currentQuantity: 100,
      unit: 'kg',
      minQuantity: 25,
      maxQuantity: 200,
      cost: 3.00,
      costUnit: 'kg',
      vendorId: flourVendor.id,
    },
  });

  const ryeFlour = await prisma.ingredient.create({
    data: {
      bakeryId: artisanBakery.id,
      name: 'Rye Flour',
      category: 'Flour',
      currentQuantity: 50,
      unit: 'kg',
      minQuantity: 10,
      maxQuantity: 100,
      cost: 3.50,
      costUnit: 'kg',
      vendorId: flourVendor.id,
    },
  });

  const salt = await prisma.ingredient.create({
    data: {
      bakeryId: artisanBakery.id,
      name: 'Sea Salt',
      category: 'Salt',
      currentQuantity: 20,
      unit: 'kg',
      minQuantity: 5,
      maxQuantity: 50,
      cost: 8.00,
      costUnit: 'kg',
      vendorId: flourVendor.id,
    },
  });

  const water = await prisma.ingredient.create({
    data: {
      bakeryId: artisanBakery.id,
      name: 'Filtered Water',
      category: 'Water',
      currentQuantity: 500,
      unit: 'L',
      minQuantity: 100,
      maxQuantity: 1000,
      cost: 0.01,
      costUnit: 'L',
      notes: 'Municipal water, filtered',
    },
  });

  const yeast = await prisma.ingredient.create({
    data: {
      bakeryId: artisanBakery.id,
      name: 'Active Dry Yeast',
      category: 'Leavening',
      currentQuantity: 5,
      unit: 'kg',
      minQuantity: 1,
      maxQuantity: 10,
      cost: 15.00,
      costUnit: 'kg',
      vendorId: flourVendor.id,
    },
  });

  const butter = await prisma.ingredient.create({
    data: {
      bakeryId: artisanBakery.id,
      name: 'Unsalted Butter (Organic)',
      category: 'Dairy',
      currentQuantity: 30,
      unit: 'kg',
      minQuantity: 10,
      maxQuantity: 50,
      cost: 12.00,
      costUnit: 'kg',
      vendorId: dairyVendor.id,
      notes: 'Organic, 82% butterfat',
    },
  });

  const milk = await prisma.ingredient.create({
    data: {
      bakeryId: artisanBakery.id,
      name: 'Whole Milk',
      category: 'Dairy',
      currentQuantity: 40,
      unit: 'L',
      minQuantity: 10,
      maxQuantity: 100,
      cost: 2.00,
      costUnit: 'L',
      vendorId: dairyVendor.id,
    },
  });

  const eggs = await prisma.ingredient.create({
    data: {
      bakeryId: artisanBakery.id,
      name: 'Large Eggs (Organic)',
      category: 'Eggs',
      currentQuantity: 600,
      unit: 'unit',
      minQuantity: 100,
      maxQuantity: 1000,
      cost: 0.50,
      costUnit: 'unit',
      vendorId: dairyVendor.id,
    },
  });

  const sugar = await prisma.ingredient.create({
    data: {
      bakeryId: artisanBakery.id,
      name: 'Granulated Sugar',
      category: 'Sugar',
      currentQuantity: 75,
      unit: 'kg',
      minQuantity: 20,
      maxQuantity: 150,
      cost: 2.00,
      costUnit: 'kg',
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
        category: 'Mixers',
        manufacturer: 'Hobart',
        model: 'HL800',
        serialNumber: 'HB-2023-001',
        status: EquipmentStatus.OPERATIONAL,
        purchaseDate: new Date('2023-01-15'),
        purchaseCost: 8500.00,
        location: 'Main Production',
        notes: 'Primary dough mixer - handles up to 50kg flour',
      },
      {
        bakeryId: artisanBakery.id,
        name: 'Deck Oven (3-deck)',
        category: 'Ovens',
        manufacturer: 'Blodgett',
        model: 'DeckMaster-3',
        serialNumber: 'BL-2022-045',
        status: EquipmentStatus.OPERATIONAL,
        purchaseDate: new Date('2022-06-10'),
        purchaseCost: 15000.00,
        location: 'Baking Area',
        maintenanceSchedule: 'Quarterly professional cleaning',
        notes: 'Steam injection capable - primary bread oven',
      },
      {
        bakeryId: artisanBakery.id,
        name: 'Proofing Cabinet (Full-size)',
        category: 'Proofing',
        manufacturer: 'Bakers Pride',
        model: 'ProofMaster-2000',
        serialNumber: 'BP-2023-012',
        status: EquipmentStatus.OPERATIONAL,
        purchaseDate: new Date('2023-03-20'),
        purchaseCost: 3200.00,
        location: 'Proofing Room',
        maintenanceSchedule: 'Monthly inspection',
      },
      {
        bakeryId: artisanBakery.id,
        name: 'Dough Sheeter',
        category: 'Sheeters',
        manufacturer: 'Somerset',
        model: 'CDR-2000',
        serialNumber: 'SM-2021-089',
        status: EquipmentStatus.OPERATIONAL,
        purchaseDate: new Date('2021-11-05'),
        purchaseCost: 2800.00,
        location: 'Lamination Station',
      },
      {
        bakeryId: artisanBakery.id,
        name: 'Walk-in Refrigerator',
        category: 'Refrigeration',
        manufacturer: 'Kolpak',
        model: 'WalkIn-1012',
        serialNumber: 'KP-2020-034',
        status: EquipmentStatus.OPERATIONAL,
        purchaseDate: new Date('2020-08-15'),
        purchaseCost: 12000.00,
        location: 'Cold Storage',
        maintenanceSchedule: 'Bi-annual professional service',
        notes: '10ft x 12ft, temperature: 34-38°F',
      },
      {
        bakeryId: artisanBakery.id,
        name: 'Stand Mixer (20qt)',
        category: 'Mixers',
        manufacturer: 'KitchenAid',
        model: 'Commercial-20',
        serialNumber: 'KA-2023-067',
        status: EquipmentStatus.MAINTENANCE,
        purchaseDate: new Date('2023-07-12'),
        purchaseCost: 1200.00,
        location: 'Pastry Station',
        notes: 'Motor needs replacement - scheduled for next week',
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
      category: 'Bread',
      yieldQuantity: 2,
      yieldUnit: 'loaves',
      prepTimeMinutes: 60,
      cookTimeMinutes: 45,
      totalTimeMinutes: 1545, // Including fermentation time (24 hours)
      difficulty: 'Medium',
      instructions: '# Classic Sourdough Bread\n\n## Overview\nThis recipe produces two artisan sourdough loaves with a crispy crust and complex flavor.\n\n## Steps\n\n### 1. Prepare Levain (Night Before)\n- Mix sourdough starter with flour and water\n- Let ferment overnight at room temperature\n- Should be bubbly and doubled in size\n\n### 2. Autolyse\n- Mix bread flour and water\n- Rest for 30-60 minutes\n- This develops gluten without kneading\n\n### 3. Mix Dough\n- Add levain and salt to autolyse\n- Mix until well incorporated\n- Perform stretch and folds\n\n### 4. Bulk Fermentation\n- Let dough rise for 4-6 hours at 75°F\n- Perform stretch and folds every 30 minutes (first 2 hours)\n- Dough should increase by 50% in volume\n\n### 5. Shape\n- Divide dough into two portions\n- Pre-shape into rounds\n- Rest 20 minutes\n- Final shape into batards or boules\n\n### 6. Final Proof\n- Place in bannetons seam-side up\n- Refrigerate overnight (12-18 hours)\n- Or proof at room temp for 3-4 hours\n\n### 7. Bake\n- Preheat oven to 475°F with Dutch oven inside\n- Score loaves\n- Bake covered for 20 minutes\n- Uncover and bake 25 more minutes until deep golden\n- Internal temperature should reach 205°F\n\n### 8. Cool\n- Cool on rack for at least 1 hour before slicing\n- Crust will continue to crisp as it cools',
      isPublished: true,
      createdById: artisanOwner.id,
    },
  });

  // Create recipe sections and ingredients for Sourdough
  const levainSection = await prisma.recipeSection.create({
    data: {
      recipeId: sourdoughRecipe.id,
      name: 'Levain (Sourdough Starter)',
      orderIndex: 0,
      ingredients: {
        create: [
          {
            ingredientId: breadFlour.id,
            quantity: 100,
            unit: 'g',
            notes: 'For levain',
          },
          {
            ingredientId: water.id,
            quantity: 100,
            unit: 'mL',
            notes: 'Room temperature',
          },
        ],
      },
    },
  });

  const doughSection = await prisma.recipeSection.create({
    data: {
      recipeId: sourdoughRecipe.id,
      name: 'Main Dough',
      orderIndex: 1,
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
            notes: 'Adjust hydration as needed',
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
      category: 'Bread',
      yieldQuantity: 2,
      yieldUnit: 'loaves',
      prepTimeMinutes: 30,
      cookTimeMinutes: 40,
      totalTimeMinutes: 210,
      difficulty: 'Easy',
      instructions: '# Honey Whole Wheat Bread\n\n## A wholesome, naturally sweet bread perfect for sandwiches and toast.\n\n### Mixing\n1. Combine warm water and yeast, let proof 5 minutes\n2. Add honey, salt, and butter\n3. Mix in whole wheat flour and bread flour\n4. Knead for 10 minutes until smooth\n\n### First Rise\n1. Place in oiled bowl\n2. Cover and let rise 60 minutes\n\n### Shape and Second Rise\n1. Divide into two loaves\n2. Shape and place in greased pans\n3. Let rise 45 minutes\n\n### Bake\n1. Preheat oven to 350°F\n2. Bake 40 minutes until golden\n3. Internal temp should reach 190°F',
      isPublished: true,
      createdById: artisanOwner.id,
    },
  });

  await prisma.recipeSection.create({
    data: {
      recipeId: wholeWheatRecipe.id,
      name: 'Ingredients',
      orderIndex: 0,
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
            notes: 'Warm (105-115°F)',
          },
          {
            ingredientId: yeast.id,
            quantity: 14,
            unit: 'g',
            notes: '2 packets',
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
            notes: 'Melted',
          },
          {
            ingredientId: sugar.id,
            quantity: 75,
            unit: 'g',
            notes: 'Honey can be substituted',
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
      category: 'Pastry',
      yieldQuantity: 24,
      yieldUnit: 'croissants',
      prepTimeMinutes: 180,
      cookTimeMinutes: 20,
      totalTimeMinutes: 1200, // Includes overnight rest
      difficulty: 'Hard',
      instructions: '# Butter Croissants\n\n## Master the art of laminated dough\n\n### Day 1: Dough\n1. Make dough with flour, milk, yeast, sugar, salt\n2. Refrigerate overnight\n\n### Day 2: Lamination\n1. Roll out butter block\n2. Encase butter in dough\n3. Perform 3 sets of letter folds\n4. Rest between folds\n\n### Shaping\n1. Roll dough to 5mm thickness\n2. Cut triangles\n3. Roll from wide end to point\n4. Curve into crescent shape\n\n### Proofing and Baking\n1. Proof 2-3 hours until puffy\n2. Egg wash\n3. Bake at 375°F for 20 minutes until golden',
      isPublished: true,
      createdById: artisanOwner.id,
    },
  });

  await prisma.recipeSection.create({
    data: {
      recipeId: croissantRecipe.id,
      name: 'Dough',
      orderIndex: 0,
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
            notes: 'Cold',
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
            notes: 'For dough',
          },
        ],
      },
    },
  });

  await prisma.recipeSection.create({
    data: {
      recipeId: croissantRecipe.id,
      name: 'Butter Block (for lamination)',
      orderIndex: 1,
      ingredients: {
        create: [
          {
            ingredientId: butter.id,
            quantity: 600,
            unit: 'g',
            notes: 'European style, 82% butterfat',
          },
        ],
      },
    },
  });

  await prisma.recipeSection.create({
    data: {
      recipeId: croissantRecipe.id,
      name: 'Egg Wash',
      orderIndex: 2,
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
      bakeryId: artisanBakery.id,
      type: TransactionType.PURCHASE,
      quantity: 250,
      unit: 'kg',
      cost: 625.00,
      notes: 'Weekly flour delivery from Northwest Grain',
      createdById: artisanManager.id,
    },
  });

  await prisma.inventoryTransaction.create({
    data: {
      ingredientId: butter.id,
      bakeryId: artisanBakery.id,
      type: TransactionType.PURCHASE,
      quantity: 30,
      unit: 'kg',
      cost: 360.00,
      notes: 'Monthly butter order from Valley Fresh Dairy',
      createdById: artisanManager.id,
    },
  });

  // Simulate usage from production
  await prisma.inventoryTransaction.create({
    data: {
      ingredientId: breadFlour.id,
      bakeryId: artisanBakery.id,
      type: TransactionType.USAGE,
      quantity: 50,
      unit: 'kg',
      notes: 'Used in sourdough production - Week 1',
      createdById: artisanBaker.id,
    },
  });

  // Simulate waste/adjustment
  await prisma.inventoryTransaction.create({
    data: {
      ingredientId: wholeWheatFlour.id,
      bakeryId: artisanBakery.id,
      type: TransactionType.ADJUSTMENT,
      quantity: -5,
      unit: 'kg',
      notes: 'Inventory count adjustment - damaged bag',
      createdById: artisanManager.id,
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
      scheduledDate: new Date('2025-01-16'),
      quantity: 50,
      unit: 'loaves',
      status: 'completed',
      notes: 'Morning production batch',
      assignedToId: artisanBaker.id,
      completedAt: new Date('2025-01-16T14:30:00'),
      completedById: artisanBaker.id,
    },
  });

  // In-progress bake sheet
  await prisma.bakeSheet.create({
    data: {
      recipeId: wholeWheatRecipe.id,
      bakeryId: artisanBakery.id,
      scheduledDate: new Date(),
      quantity: 30,
      unit: 'loaves',
      status: 'in_progress',
      notes: 'Today\'s whole wheat production',
      assignedToId: artisanBaker.id,
    },
  });

  // Scheduled bake sheet
  await prisma.bakeSheet.create({
    data: {
      recipeId: croissantRecipe.id,
      bakeryId: artisanBakery.id,
      scheduledDate: new Date(Date.now() + 86400000), // Tomorrow
      quantity: 100,
      unit: 'croissants',
      status: 'scheduled',
      notes: 'Weekend pastry production',
      assignedToId: artisanBaker.id,
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
