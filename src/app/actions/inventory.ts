'use server';

import { db } from '@/lib/db';
import { getCurrentUser } from '@/lib/clerk';
import { revalidatePath } from 'next/cache';
import { createActivityLog } from './activity-log';
import {
  addInventoryLotSchema,
  useInventorySchema,
  adjustInventorySchema,
  updateInventoryLotSchema,
  type AddInventoryLotInput,
  type UseInventoryInput,
  type AdjustInventoryInput,
  type UpdateInventoryLotInput,
} from '@/lib/validations/inventory';
import { Decimal } from '@prisma/client/runtime/library';
import {
  getTotalQuantity,
  getWeightedAverageCost,
  getTotalValue,
  calculateFIFOUsage,
  type InventoryWithLots,
} from '@/lib/inventory';
import { convertQuantity } from '@/lib/unitConvert';

/**
 * Add a new inventory lot (purchase)
 */
export async function addInventoryLot(data: AddInventoryLotInput) {
  try {
    const currentUser = await getCurrentUser();

    if (!currentUser) {
      return { success: false, error: 'Unauthorized: You must be logged in' };
    }

    // Validate input
    const validatedData = addInventoryLotSchema.parse(data);

    // Get ingredient and verify ownership
    const ingredient = await db.ingredient.findUnique({
      where: { id: validatedData.ingredientId },
      include: { inventory: true },
    });

    if (!ingredient) {
      return { success: false, error: 'Ingredient not found' };
    }

    if (currentUser.bakeryId !== ingredient.bakeryId) {
      return {
        success: false,
        error: 'Unauthorized: You can only add inventory for your bakery',
      };
    }

    // If vendor is provided, verify it belongs to the same bakery
    if (validatedData.vendorId) {
      const vendor = await db.vendor.findUnique({
        where: { id: validatedData.vendorId },
      });
      if (!vendor || vendor.bakeryId !== ingredient.bakeryId) {
        return { success: false, error: 'Invalid vendor' };
      }
    }

    const result = await db.$transaction(async (tx) => {
      // Get or create Inventory record for ingredient
      let inventory = ingredient.inventory;

      if (!inventory) {
        inventory = await tx.inventory.create({
          data: {
            bakeryId: ingredient.bakeryId,
            ingredientId: ingredient.id,
            displayUnit: ingredient.unit, // Default to ingredient's unit
          },
        });
      }

      // Create lot
      const lot = await tx.inventoryLot.create({
        data: {
          inventoryId: inventory.id,
          purchaseQty: new Decimal(validatedData.quantity),
          remainingQty: new Decimal(validatedData.quantity),
          purchaseUnit: validatedData.unit,
          costPerUnit: new Decimal(validatedData.costPerUnit),
          expiresAt: validatedData.expiresAt,
          vendorId: validatedData.vendorId,
          notes: validatedData.notes,
        },
        include: {
          vendor: { select: { id: true, name: true } },
        },
      });

      return lot;
    });

    // Log activity
    await createActivityLog({
      userId: currentUser.id,
      action: 'CREATE',
      entityType: 'inventory_lot',
      entityId: result.id,
      entityName: `${ingredient.name} - ${validatedData.quantity} ${validatedData.unit}`,
      description: `Added ${validatedData.quantity} ${validatedData.unit} of "${ingredient.name}" at $${validatedData.costPerUnit}/${validatedData.unit}`,
      metadata: {
        ingredientId: ingredient.id,
        lotId: result.id,
        quantity: validatedData.quantity,
        unit: validatedData.unit,
        costPerUnit: validatedData.costPerUnit,
        vendorId: validatedData.vendorId,
      },
      bakeryId: ingredient.bakeryId,
    });

    revalidatePath('/dashboard/ingredients');
    revalidatePath(`/dashboard/ingredients/${ingredient.id}`);

    return {
      success: true,
      data: {
        ...result,
        purchaseQty: Number(result.purchaseQty),
        remainingQty: Number(result.remainingQty),
        costPerUnit: Number(result.costPerUnit),
      },
    };
  } catch (error) {
    console.error('Failed to add inventory lot:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to add inventory lot',
    };
  }
}

/**
 * Use inventory with FIFO deduction
 */
export async function useInventory(data: UseInventoryInput, createdBy?: string) {
  try {
    const currentUser = await getCurrentUser();

    if (!currentUser) {
      return { success: false, error: 'Unauthorized: You must be logged in' };
    }

    // Validate input
    const validatedData = useInventorySchema.parse(data);

    // Get ingredient with inventory and lots
    const ingredient = await db.ingredient.findUnique({
      where: { id: validatedData.ingredientId },
      include: {
        inventory: {
          include: {
            lots: {
              where: { remainingQty: { gt: 0 } },
              orderBy: { purchasedAt: 'asc' },
            },
          },
        },
      },
    });

    if (!ingredient) {
      return { success: false, error: 'Ingredient not found' };
    }

    if (currentUser.bakeryId !== ingredient.bakeryId) {
      return {
        success: false,
        error: 'Unauthorized: You can only use inventory for your bakery',
      };
    }

    if (!ingredient.inventory) {
      return { success: false, error: 'No inventory record for this ingredient' };
    }

    // Calculate FIFO usage
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

    const fifoResult = calculateFIFOUsage(
      inventoryForCalc,
      validatedData.quantity,
      validatedData.unit
    );

    // Execute FIFO deductions in transaction (even if there's a shortfall)
    const result = await db.$transaction(async (tx) => {
      const createdUsages = [];

      for (const usage of fifoResult.usages) {
        // Create usage record
        const usageRecord = await tx.inventoryUsage.create({
          data: {
            lotId: usage.lotId,
            quantity: new Decimal(usage.quantity),
            shortfall: new Decimal(0),
            reason: validatedData.reason,
            productionSheetId: validatedData.productionSheetId,
            createdBy: createdBy || currentUser.id,
            notes: validatedData.notes,
          },
        });

        // Update lot's remaining quantity
        await tx.inventoryLot.update({
          where: { id: usage.lotId },
          data: {
            remainingQty: {
              decrement: new Decimal(usage.quantity),
            },
          },
        });

        createdUsages.push(usageRecord);
      }

      // If there's a shortfall, record it on the last usage or create a shortfall-only record
      if (fifoResult.hasShortfall && createdUsages.length > 0) {
        const lastUsageId = createdUsages[createdUsages.length - 1].id;
        const lastLotUsage = fifoResult.usages[fifoResult.usages.length - 1];

        // Convert shortfall to lot's unit
        const shortfallInLotUnit = fifoResult.shortfall; // Already in display unit, might need conversion

        await tx.inventoryUsage.update({
          where: { id: lastUsageId },
          data: {
            shortfall: new Decimal(shortfallInLotUnit),
            notes: validatedData.notes
              ? `${validatedData.notes} (shortfall: ${fifoResult.shortfall.toFixed(3)})`
              : `Shortfall: ${fifoResult.shortfall.toFixed(3)}`,
          },
        });
      }

      return { createdUsages, hasShortfall: fifoResult.hasShortfall, shortfall: fifoResult.shortfall };
    });

    // Log activity
    await createActivityLog({
      userId: currentUser.id,
      action: 'UPDATE',
      entityType: 'inventory',
      entityId: ingredient.inventory.id,
      entityName: ingredient.name,
      description: `Used ${validatedData.quantity} ${validatedData.unit} of "${ingredient.name}" (${validatedData.reason})${result.hasShortfall ? ` - shortfall: ${result.shortfall.toFixed(3)}` : ''}`,
      metadata: {
        ingredientId: ingredient.id,
        quantity: validatedData.quantity,
        unit: validatedData.unit,
        reason: validatedData.reason,
        productionSheetId: validatedData.productionSheetId,
        lotsAffected: fifoResult.usages.length,
        hasShortfall: result.hasShortfall,
        shortfall: result.shortfall,
      },
      bakeryId: ingredient.bakeryId,
    });

    revalidatePath('/dashboard/ingredients');
    revalidatePath(`/dashboard/ingredients/${ingredient.id}`);

    return {
      success: true,
      data: result.createdUsages.map((u) => ({
        ...u,
        quantity: Number(u.quantity),
        shortfall: Number(u.shortfall),
      })),
      hasShortfall: result.hasShortfall,
      shortfall: result.shortfall,
    };
  } catch (error) {
    console.error('Failed to use inventory:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to use inventory',
    };
  }
}

/**
 * Adjust inventory for a specific lot (manual correction)
 */
export async function adjustInventory(data: AdjustInventoryInput) {
  try {
    const currentUser = await getCurrentUser();

    if (!currentUser) {
      return { success: false, error: 'Unauthorized: You must be logged in' };
    }

    // Validate input
    const validatedData = adjustInventorySchema.parse(data);

    // Get lot with inventory and ingredient
    const lot = await db.inventoryLot.findUnique({
      where: { id: validatedData.lotId },
      include: {
        inventory: {
          include: {
            ingredient: true,
          },
        },
      },
    });

    if (!lot) {
      return { success: false, error: 'Lot not found' };
    }

    if (currentUser.bakeryId !== lot.inventory.bakeryId) {
      return {
        success: false,
        error: 'Unauthorized: You can only adjust inventory for your bakery',
      };
    }

    // Calculate new remaining quantity
    const newRemaining = Number(lot.remainingQty) + validatedData.quantity;
    if (newRemaining < 0) {
      return {
        success: false,
        error: 'Adjustment would result in negative inventory',
      };
    }

    const result = await db.$transaction(async (tx) => {
      // Create usage record for adjustment
      const usage = await tx.inventoryUsage.create({
        data: {
          lotId: lot.id,
          quantity: new Decimal(Math.abs(validatedData.quantity)),
          reason: 'ADJUST',
          createdBy: currentUser.id,
          notes: validatedData.notes,
        },
      });

      // Update lot
      const updatedLot = await tx.inventoryLot.update({
        where: { id: lot.id },
        data: {
          remainingQty: new Decimal(newRemaining),
        },
      });

      return { usage, lot: updatedLot };
    });

    const adjustmentType = validatedData.quantity > 0 ? 'increased' : 'decreased';

    // Log activity
    await createActivityLog({
      userId: currentUser.id,
      action: 'UPDATE',
      entityType: 'inventory_lot',
      entityId: lot.id,
      entityName: lot.inventory.ingredient.name,
      description: `Adjusted inventory for "${lot.inventory.ingredient.name}": ${adjustmentType} by ${Math.abs(validatedData.quantity)} ${lot.purchaseUnit}`,
      metadata: {
        lotId: lot.id,
        ingredientId: lot.inventory.ingredientId,
        adjustment: validatedData.quantity,
        previousQty: Number(lot.remainingQty),
        newQty: newRemaining,
      },
      bakeryId: lot.inventory.bakeryId,
    });

    revalidatePath('/dashboard/ingredients');
    revalidatePath(`/dashboard/ingredients/${lot.inventory.ingredientId}`);

    return {
      success: true,
      data: {
        ...result.lot,
        purchaseQty: Number(result.lot.purchaseQty),
        remainingQty: Number(result.lot.remainingQty),
        costPerUnit: Number(result.lot.costPerUnit),
      },
    };
  } catch (error) {
    console.error('Failed to adjust inventory:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to adjust inventory',
    };
  }
}

/**
 * Update a lot's metadata (not quantity)
 */
export async function updateInventoryLot(data: UpdateInventoryLotInput) {
  try {
    const currentUser = await getCurrentUser();

    if (!currentUser) {
      return { success: false, error: 'Unauthorized: You must be logged in' };
    }

    // Validate input
    const validatedData = updateInventoryLotSchema.parse(data);

    // Get lot with inventory
    const lot = await db.inventoryLot.findUnique({
      where: { id: validatedData.id },
      include: {
        inventory: {
          include: { ingredient: true },
        },
      },
    });

    if (!lot) {
      return { success: false, error: 'Lot not found' };
    }

    if (currentUser.bakeryId !== lot.inventory.bakeryId) {
      return {
        success: false,
        error: 'Unauthorized: You can only update inventory for your bakery',
      };
    }

    // If vendor is provided, verify it belongs to the same bakery
    if (validatedData.vendorId) {
      const vendor = await db.vendor.findUnique({
        where: { id: validatedData.vendorId },
      });
      if (!vendor || vendor.bakeryId !== lot.inventory.bakeryId) {
        return { success: false, error: 'Invalid vendor' };
      }
    }

    const { id, ...updateData } = validatedData;

    const updatedLot = await db.inventoryLot.update({
      where: { id },
      data: updateData,
      include: {
        vendor: { select: { id: true, name: true } },
      },
    });

    // Log activity
    await createActivityLog({
      userId: currentUser.id,
      action: 'UPDATE',
      entityType: 'inventory_lot',
      entityId: lot.id,
      entityName: lot.inventory.ingredient.name,
      description: `Updated lot details for "${lot.inventory.ingredient.name}"`,
      metadata: {
        lotId: lot.id,
        ingredientId: lot.inventory.ingredientId,
        updatedFields: Object.keys(updateData),
      },
      bakeryId: lot.inventory.bakeryId,
    });

    revalidatePath('/dashboard/ingredients');
    revalidatePath(`/dashboard/ingredients/${lot.inventory.ingredientId}`);

    return {
      success: true,
      data: {
        ...updatedLot,
        purchaseQty: Number(updatedLot.purchaseQty),
        remainingQty: Number(updatedLot.remainingQty),
        costPerUnit: Number(updatedLot.costPerUnit),
      },
    };
  } catch (error) {
    console.error('Failed to update inventory lot:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to update inventory lot',
    };
  }
}

/**
 * Get inventory for an ingredient with aggregates
 */
export async function getInventoryForIngredient(ingredientId: string) {
  try {
    const currentUser = await getCurrentUser();

    if (!currentUser) {
      return { success: false, error: 'Unauthorized: You must be logged in' };
    }

    // Get ingredient with inventory and lots
    const ingredient = await db.ingredient.findUnique({
      where: { id: ingredientId },
      include: {
        inventory: {
          include: {
            lots: {
              orderBy: { purchasedAt: 'asc' },
              include: {
                vendor: { select: { id: true, name: true } },
                usages: {
                  orderBy: { createdAt: 'desc' },
                  take: 5,
                  include: {
                    creator: { select: { id: true, name: true } },
                    productionSheet: { select: { id: true, recipe: { select: { name: true } } } },
                  },
                },
              },
            },
          },
        },
      },
    });

    if (!ingredient) {
      return { success: false, error: 'Ingredient not found' };
    }

    if (currentUser.bakeryId !== ingredient.bakeryId) {
      return {
        success: false,
        error: 'Unauthorized: You can only view inventory for your bakery',
      };
    }

    if (!ingredient.inventory) {
      return {
        success: true,
        data: {
          ingredientId,
          displayUnit: ingredient.unit,
          totalQuantity: 0,
          weightedAverageCost: 0,
          totalValue: 0,
          lots: [],
        },
      };
    }

    // Calculate aggregates
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

    const totalQuantity = getTotalQuantity(inventoryForCalc);
    const weightedAverageCost = getWeightedAverageCost(inventoryForCalc);
    const totalValue = getTotalValue(inventoryForCalc);

    return {
      success: true,
      data: {
        id: ingredient.inventory.id,
        ingredientId,
        displayUnit: ingredient.inventory.displayUnit,
        totalQuantity,
        weightedAverageCost,
        totalValue,
        lots: ingredient.inventory.lots.map((lot) => ({
          ...lot,
          purchaseQty: Number(lot.purchaseQty),
          remainingQty: Number(lot.remainingQty),
          costPerUnit: Number(lot.costPerUnit),
          usages: lot.usages.map((u) => ({
            ...u,
            quantity: Number(u.quantity),
          })),
        })),
      },
    };
  } catch (error) {
    console.error('Failed to get inventory:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to get inventory',
    };
  }
}

/**
 * Delete an inventory lot (only if no usages exist)
 */
export async function deleteInventoryLot(lotId: string) {
  try {
    const currentUser = await getCurrentUser();

    if (!currentUser) {
      return { success: false, error: 'Unauthorized: You must be logged in' };
    }

    // Get lot with inventory and usage count
    const lot = await db.inventoryLot.findUnique({
      where: { id: lotId },
      include: {
        inventory: {
          include: { ingredient: true },
        },
        _count: {
          select: { usages: true },
        },
      },
    });

    if (!lot) {
      return { success: false, error: 'Lot not found' };
    }

    if (currentUser.bakeryId !== lot.inventory.bakeryId) {
      return {
        success: false,
        error: 'Unauthorized: You can only delete inventory for your bakery',
      };
    }

    if (lot._count.usages > 0) {
      return {
        success: false,
        error: `Cannot delete lot with ${lot._count.usages} usage record(s). Lot has been partially or fully used.`,
      };
    }

    await db.inventoryLot.delete({
      where: { id: lotId },
    });

    // Log activity
    await createActivityLog({
      userId: currentUser.id,
      action: 'DELETE',
      entityType: 'inventory_lot',
      entityId: lot.id,
      entityName: lot.inventory.ingredient.name,
      description: `Deleted unused lot for "${lot.inventory.ingredient.name}" (${lot.purchaseQty} ${lot.purchaseUnit})`,
      metadata: {
        lotId: lot.id,
        ingredientId: lot.inventory.ingredientId,
        quantity: Number(lot.purchaseQty),
        unit: lot.purchaseUnit,
      },
      bakeryId: lot.inventory.bakeryId,
    });

    revalidatePath('/dashboard/ingredients');
    revalidatePath(`/dashboard/ingredients/${lot.inventory.ingredientId}`);

    return { success: true };
  } catch (error) {
    console.error('Failed to delete inventory lot:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to delete inventory lot',
    };
  }
}

/**
 * Get recent inventory activity (usages) for a bakery
 */
export async function getRecentInventoryActivity(bakeryId: string, limit: number = 10) {
  try {
    const currentUser = await getCurrentUser();

    if (!currentUser) {
      return { success: false, error: 'Unauthorized: You must be logged in' };
    }

    if (currentUser.bakeryId !== bakeryId) {
      return {
        success: false,
        error: 'Unauthorized: You can only view inventory for your bakery',
      };
    }

    const usages = await db.inventoryUsage.findMany({
      where: {
        lot: {
          inventory: {
            bakeryId,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
      take: limit,
      include: {
        lot: {
          include: {
            inventory: {
              include: {
                ingredient: {
                  select: { id: true, name: true },
                },
              },
            },
          },
        },
        creator: { select: { id: true, name: true, email: true } },
        productionSheet: { select: { id: true, recipe: { select: { name: true } } } },
      },
    });

    return {
      success: true,
      data: usages.map((usage) => ({
        id: usage.id,
        reason: usage.reason,
        quantity: Number(usage.quantity),
        unit: usage.lot.purchaseUnit,
        ingredientId: usage.lot.inventory.ingredient.id,
        ingredientName: usage.lot.inventory.ingredient.name,
        creatorName: usage.creator.name || usage.creator.email,
        productionSheetId: usage.productionSheetId,
        recipeName: usage.productionSheet?.recipe.name ?? null,
        notes: usage.notes,
        createdAt: usage.createdAt,
      })),
    };
  } catch (error) {
    console.error('Failed to get recent inventory activity:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to get inventory activity',
    };
  }
}
