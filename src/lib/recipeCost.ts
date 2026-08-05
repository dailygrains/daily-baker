import { db } from '@/lib/db';
import { convertQuantity } from '@/lib/unitConvert';
import { getWeightedAverageCost, type InventoryWithLots } from '@/lib/inventory';

/**
 * Calculate total cost of a recipe based on ingredients
 * Uses weighted average cost from FIFO lot-based inventory
 */
export async function calculateRecipeCost(
  sections: Array<{
    ingredients: Array<{
      ingredientId: string;
      quantity: number;
      unit: string;
    }>;
  }>
): Promise<number> {
  let totalCost = 0;

  for (const section of sections) {
    for (const ing of section.ingredients) {
      // Fetch ingredient with inventory for weighted average cost
      const ingredient = await db.ingredient.findUnique({
        where: { id: ing.ingredientId },
        include: {
          inventory: {
            include: {
              lots: {
                where: { remainingQty: { gt: 0 } },
              },
            },
          },
        },
      });

      if (ingredient) {
        const density = ingredient.densityGramsPerMl
          ? Number(ingredient.densityGramsPerMl)
          : null;

        // Get weighted average cost from inventory
        let costPerUnit = 0;
        let displayUnit = ingredient.unit;

        if (ingredient.inventory && ingredient.inventory.lots.length > 0) {
          const inventoryForCalc: InventoryWithLots = {
            id: ingredient.inventory.id,
            displayUnit: ingredient.inventory.displayUnit,
            lots: ingredient.inventory.lots.map((lot) => ({
              id: lot.id,
              purchaseQty: lot.purchaseQty,
              remainingQty: lot.remainingQty,
              purchaseUnit: lot.purchaseUnit,
              costPerUnit: lot.costPerUnit,
              purchasedAt: lot.purchasedAt,
              expiresAt: lot.expiresAt,
              vendorId: lot.vendorId,
              notes: lot.notes,
            })),
          };

          costPerUnit = getWeightedAverageCost(inventoryForCalc, density);
          displayUnit = ingredient.inventory.displayUnit;
        }

        // Convert quantity to display unit if necessary
        let adjustedQuantity = ing.quantity;
        if (ing.unit !== displayUnit) {
          const converted = convertQuantity(
            ing.quantity,
            ing.unit,
            displayUnit,
            density
          );

          if (converted !== null) {
            adjustedQuantity = converted;
          } else {
            // If conversion fails, skip this ingredient's cost
            console.warn(
              `Cannot convert from ${ing.unit} to ${displayUnit} for ingredient cost calculation`
            );
            continue;
          }
        }

        // Calculate cost using weighted average cost per display unit
        const cost = costPerUnit * adjustedQuantity;
        totalCost += cost;
      }
    }
  }

  return totalCost;
}
