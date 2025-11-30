import { PrismaClient } from '../../../src/generated/prisma';

const prisma = new PrismaClient();

async function main() {
  console.log('Starting data migration...');

  // Get all ingredients with inventory data
  const ingredients = await prisma.ingredient.findMany({
    where: {
      currentQty: { not: null },
      costPerUnit: { not: null },
      unit: { not: null },
    },
    include: {
      inventoryTransactions: {
        where: {
          ingredientId: { not: null },
          inventoryItemId: null, // Only get transactions not yet migrated
        },
      },
    },
  });

  console.log(`Found ${ingredients.length} ingredients to migrate`);

  for (const ingredient of ingredients) {
    console.log(`\nMigrating ingredient: ${ingredient.name}`);

    // Create InventoryItem from Ingredient data
    const inventoryItem = await prisma.inventoryItem.create({
      data: {
        bakeryId: ingredient.bakeryId,
        ingredientId: ingredient.id,
        quantity: ingredient.currentQty!,
        unit: ingredient.unit!,
        purchasePrice: ingredient.costPerUnit!,
        // Note: we don't have purchaseDate, vendor, etc. in old schema
      },
    });

    console.log(`  Created InventoryItem: ${inventoryItem.id}`);

    // Update defaultUnit on ingredient
    await prisma.ingredient.update({
      where: { id: ingredient.id },
      data: { defaultUnit: ingredient.unit },
    });

    console.log(`  Set defaultUnit to: ${ingredient.unit}`);

    // Update InventoryTransactions to reference new InventoryItem
    if (ingredient.inventoryTransactions.length > 0) {
      const result = await prisma.inventoryTransaction.updateMany({
        where: { ingredientId: ingredient.id },
        data: { inventoryItemId: inventoryItem.id },
      });

      console.log(`  Updated ${result.count} transactions`);
    }
  }

  console.log('\n✅ Data migration completed successfully!');
}

main()
  .catch((error) => {
    console.error('❌ Data migration failed:');
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
