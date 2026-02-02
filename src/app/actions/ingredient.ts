'use server';

import { db } from '@/lib/db';
import { getCurrentUser } from '@/lib/clerk';
import { revalidatePath } from 'next/cache';
import { createActivityLog } from './activity-log';
import {
  createIngredientSchema,
  updateIngredientSchema,
  type CreateIngredientInput,
  type UpdateIngredientInput,
} from '@/lib/validations/ingredient';
import {
  getTotalQuantity,
  getWeightedAverageCost,
  type InventoryWithLots,
} from '@/lib/inventory';

/**
 * Helper to calculate inventory aggregates for an ingredient
 */
function calculateInventoryAggregates(inventory: {
  id: string;
  displayUnit: string;
  lowStockThreshold?: { toNumber: () => number } | number | null;
  lots: Array<{
    id: string;
    purchaseQty: { toNumber: () => number } | number;
    remainingQty: { toNumber: () => number } | number;
    purchaseUnit: string;
    costPerUnit: { toNumber: () => number } | number;
    purchasedAt: Date;
    expiresAt: Date | null;
    vendorId: string | null;
    notes: string | null;
  }>;
} | null): { currentQty: number; costPerUnit: number; lowStockThreshold: number | null } {
  if (!inventory || !inventory.lots.length) {
    const threshold = inventory?.lowStockThreshold != null
      ? (typeof inventory.lowStockThreshold === 'number' ? inventory.lowStockThreshold : inventory.lowStockThreshold.toNumber())
      : null;
    return { currentQty: 0, costPerUnit: 0, lowStockThreshold: threshold };
  }

  const inventoryForCalc: InventoryWithLots = {
    id: inventory.id,
    displayUnit: inventory.displayUnit,
    lots: inventory.lots.map((lot) => ({
      id: lot.id,
      purchaseQty: typeof lot.purchaseQty === 'number' ? lot.purchaseQty : lot.purchaseQty.toNumber(),
      remainingQty: typeof lot.remainingQty === 'number' ? lot.remainingQty : lot.remainingQty.toNumber(),
      purchaseUnit: lot.purchaseUnit,
      costPerUnit: typeof lot.costPerUnit === 'number' ? lot.costPerUnit : lot.costPerUnit.toNumber(),
      purchasedAt: lot.purchasedAt,
      expiresAt: lot.expiresAt,
      vendorId: lot.vendorId,
      notes: lot.notes,
    })),
  };

  const threshold = inventory.lowStockThreshold != null
    ? (typeof inventory.lowStockThreshold === 'number' ? inventory.lowStockThreshold : inventory.lowStockThreshold.toNumber())
    : null;

  return {
    currentQty: getTotalQuantity(inventoryForCalc),
    costPerUnit: getWeightedAverageCost(inventoryForCalc),
    lowStockThreshold: threshold,
  };
}

export async function createIngredient(data: CreateIngredientInput) {
  try {
    const currentUser = await getCurrentUser();

    if (!currentUser) {
      return {
        success: false,
        error: 'Unauthorized: You must be logged in',
      };
    }

    // Verify user belongs to the bakery
    if (currentUser.bakeryId !== data.bakeryId) {
      return {
        success: false,
        error: 'Unauthorized: You can only create ingredients for your bakery',
      };
    }

    // Validate input
    const validatedData = createIngredientSchema.parse(data);

    const ingredient = await db.ingredient.create({
      data: {
        bakeryId: validatedData.bakeryId,
        name: validatedData.name,
        unit: validatedData.unit,
      },
      include: {
        vendors: {
          include: {
            vendor: true,
          },
        },
      },
    });

    // Log the activity
    await createActivityLog({
      userId: currentUser.id!,
      action: 'CREATE',
      entityType: 'ingredient',
      entityId: ingredient.id,
      entityName: ingredient.name,
      description: `Created ingredient "${ingredient.name}"`,
      metadata: { ingredientId: ingredient.id, unit: ingredient.unit },
      bakeryId: ingredient.bakeryId,
    });

    revalidatePath('/dashboard/ingredients');

    // Return with computed aggregates (0 for new ingredients)
    return {
      success: true,
      data: {
        ...ingredient,
        currentQty: 0,
        costPerUnit: 0,
        lowStockThreshold: null,
      },
    };
  } catch (error) {
    console.error('Error creating ingredient:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to create ingredient',
    };
  }
}

export async function updateIngredient(data: UpdateIngredientInput) {
  try {
    const currentUser = await getCurrentUser();

    if (!currentUser) {
      return {
        success: false,
        error: 'Unauthorized: You must be logged in',
      };
    }

    // Validate input
    const validatedData = updateIngredientSchema.parse(data);

    // Check if ingredient exists and user has access
    const existingIngredient = await db.ingredient.findUnique({
      where: { id: validatedData.id },
      include: {
        inventory: {
          include: {
            lots: true,
          },
        },
      },
    });

    if (!existingIngredient) {
      return {
        success: false,
        error: 'Ingredient not found',
      };
    }

    if (currentUser.bakeryId !== existingIngredient.bakeryId) {
      return {
        success: false,
        error: 'Unauthorized: You can only update ingredients for your bakery',
      };
    }

    const { id, lowStockThreshold, ...updateData } = validatedData;

    const ingredient = await db.ingredient.update({
      where: { id },
      data: updateData,
      include: {
        vendors: {
          include: {
            vendor: true,
          },
        },
        inventory: {
          include: {
            lots: true,
          },
        },
      },
    });

    // Update lowStockThreshold on inventory if provided and inventory exists
    if (lowStockThreshold !== undefined && ingredient.inventory) {
      await db.inventory.update({
        where: { id: ingredient.inventory.id },
        data: { lowStockThreshold },
      });
      // Re-fetch to get updated inventory
      const updatedInventory = await db.inventory.findUnique({
        where: { id: ingredient.inventory.id },
        include: { lots: true },
      });
      if (updatedInventory) {
        ingredient.inventory = updatedInventory;
      }
    }

    // Log the activity
    await createActivityLog({
      userId: currentUser.id!,
      action: 'UPDATE',
      entityType: 'ingredient',
      entityId: ingredient.id,
      entityName: ingredient.name,
      description: `Updated ingredient "${ingredient.name}"`,
      metadata: { ingredientId: ingredient.id, updatedFields: Object.keys(updateData) },
      bakeryId: ingredient.bakeryId,
    });

    revalidatePath('/dashboard/ingredients');
    revalidatePath(`/dashboard/ingredients/${id}`);

    // Calculate aggregates from inventory
    const aggregates = calculateInventoryAggregates(ingredient.inventory);

    return {
      success: true,
      data: {
        ...ingredient,
        currentQty: aggregates.currentQty,
        costPerUnit: aggregates.costPerUnit,
      },
    };
  } catch (error) {
    console.error('Error updating ingredient:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to update ingredient',
    };
  }
}

export async function deleteIngredient(id: string) {
  try {
    const currentUser = await getCurrentUser();

    if (!currentUser) {
      return {
        success: false,
        error: 'Unauthorized: You must be logged in',
      };
    }

    // Check if ingredient exists and user has access
    const ingredient = await db.ingredient.findUnique({
      where: { id },
      include: {
        inventory: {
          include: {
            _count: {
              select: {
                lots: true,
              },
            },
          },
        },
        _count: {
          select: {
            recipeUses: true,
          },
        },
      },
    });

    if (!ingredient) {
      return {
        success: false,
        error: 'Ingredient not found',
      };
    }

    if (currentUser.bakeryId !== ingredient.bakeryId) {
      return {
        success: false,
        error: 'Unauthorized: You can only delete ingredients for your bakery',
      };
    }

    // Check if ingredient is used in recipes
    if (ingredient._count.recipeUses > 0) {
      return {
        success: false,
        error: `Cannot delete ingredient with ${ingredient._count.recipeUses} recipe usage(s). Please remove from recipes first.`,
      };
    }

    // Check if ingredient has inventory lots
    if (ingredient.inventory && ingredient.inventory._count.lots > 0) {
      return {
        success: false,
        error: `Cannot delete ingredient with ${ingredient.inventory._count.lots} inventory lot(s). Please remove inventory first.`,
      };
    }

    await db.ingredient.delete({
      where: { id },
    });

    // Log the activity
    await createActivityLog({
      userId: currentUser.id!,
      action: 'DELETE',
      entityType: 'ingredient',
      entityId: ingredient.id,
      entityName: ingredient.name,
      description: `Deleted ingredient "${ingredient.name}"`,
      metadata: { ingredientId: ingredient.id },
      bakeryId: ingredient.bakeryId,
    });

    revalidatePath('/dashboard/ingredients');

    return {
      success: true,
    };
  } catch (error) {
    console.error('Error deleting ingredient:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to delete ingredient',
    };
  }
}

export async function getIngredientsByBakery(bakeryId: string) {
  try {
    const currentUser = await getCurrentUser();

    if (!currentUser) {
      return {
        success: false,
        error: 'Unauthorized',
      };
    }

    if (currentUser.bakeryId !== bakeryId && !currentUser.isPlatformAdmin) {
      return {
        success: false,
        error: 'Unauthorized: You can only view ingredients for your bakery',
      };
    }

    const ingredients = await db.ingredient.findMany({
      where: { bakeryId },
      include: {
        vendors: {
          include: {
            vendor: {
              select: {
                id: true,
                name: true,
              },
            },
          },
        },
        inventory: {
          include: {
            lots: true,
            _count: {
              select: {
                lots: true,
              },
            },
          },
        },
      },
      orderBy: {
        name: 'asc',
      },
    });

    // Calculate aggregates from inventory for each ingredient
    return {
      success: true,
      data: ingredients.map(ingredient => {
        const aggregates = calculateInventoryAggregates(ingredient.inventory);
        return {
          ...ingredient,
          currentQty: aggregates.currentQty,
          costPerUnit: aggregates.costPerUnit,
          lowStockThreshold: aggregates.lowStockThreshold,
          _count: {
            lots: ingredient.inventory?._count?.lots ?? 0,
          },
        };
      }),
    };
  } catch (error) {
    console.error('Error fetching ingredients:', error);
    return {
      success: false,
      error: 'Failed to fetch ingredients',
    };
  }
}

export async function getIngredientById(id: string) {
  try {
    const currentUser = await getCurrentUser();

    if (!currentUser) {
      return {
        success: false,
        error: 'Unauthorized',
      };
    }

    const ingredient = await db.ingredient.findUnique({
      where: { id },
      include: {
        vendors: {
          include: {
            vendor: true,
          },
        },
        inventory: {
          include: {
            lots: {
              orderBy: {
                purchasedAt: 'asc',
              },
              include: {
                vendor: { select: { id: true, name: true } },
                usages: {
                  orderBy: { createdAt: 'desc' },
                  take: 5,
                  include: {
                    creator: { select: { id: true, name: true } },
                    productionSheet: { select: { id: true, description: true, recipes: { select: { recipe: { select: { name: true } } }, orderBy: { order: 'asc' } } } },
                  },
                },
              },
            },
          },
        },
        _count: {
          select: {
            recipeUses: true,
          },
        },
      },
    });

    if (!ingredient) {
      return {
        success: false,
        error: 'Ingredient not found',
      };
    }

    if (currentUser.bakeryId !== ingredient.bakeryId && !currentUser.isPlatformAdmin) {
      return {
        success: false,
        error: 'Unauthorized: You can only view ingredients for your bakery',
      };
    }

    // Calculate aggregates from inventory
    const aggregates = calculateInventoryAggregates(ingredient.inventory);

    // Serialize Decimal fields for client components
    return {
      success: true,
      data: {
        ...ingredient,
        currentQty: aggregates.currentQty,
        costPerUnit: aggregates.costPerUnit,
        lowStockThreshold: aggregates.lowStockThreshold,
        inventory: ingredient.inventory ? {
          ...ingredient.inventory,
          lowStockThreshold: ingredient.inventory.lowStockThreshold ? Number(ingredient.inventory.lowStockThreshold) : null,
          lots: ingredient.inventory.lots.map(lot => ({
            ...lot,
            purchaseQty: Number(lot.purchaseQty),
            remainingQty: Number(lot.remainingQty),
            costPerUnit: Number(lot.costPerUnit),
            usages: lot.usages.map(u => ({
              ...u,
              quantity: Number(u.quantity),
            })),
          })),
        } : null,
      },
    };
  } catch (error) {
    console.error('Error fetching ingredient:', error);
    return {
      success: false,
      error: 'Failed to fetch ingredient',
    };
  }
}

export async function assignVendorToIngredient(ingredientId: string, vendorId: string) {
  try {
    const currentUser = await getCurrentUser();

    if (!currentUser) {
      return {
        success: false,
        error: 'Unauthorized: You must be logged in',
      };
    }

    // Check if ingredient exists and user has access
    const ingredient = await db.ingredient.findUnique({
      where: { id: ingredientId },
      include: {
        bakery: true,
      },
    });

    if (!ingredient) {
      return {
        success: false,
        error: 'Ingredient not found',
      };
    }

    if (currentUser.bakeryId !== ingredient.bakeryId) {
      return {
        success: false,
        error: 'Unauthorized: You can only manage ingredients for your bakery',
      };
    }

    // Check if vendor exists and belongs to the same bakery
    const vendor = await db.vendor.findUnique({
      where: { id: vendorId },
    });

    if (!vendor) {
      return {
        success: false,
        error: 'Vendor not found',
      };
    }

    if (vendor.bakeryId !== ingredient.bakeryId) {
      return {
        success: false,
        error: 'Vendor does not belong to the same bakery',
      };
    }

    // Check if assignment already exists
    const existing = await db.ingredientVendor.findUnique({
      where: {
        ingredientId_vendorId: {
          ingredientId,
          vendorId,
        },
      },
    });

    if (existing) {
      return {
        success: false,
        error: 'Vendor is already assigned to this ingredient',
      };
    }

    // Create the assignment
    await db.ingredientVendor.create({
      data: {
        ingredientId,
        vendorId,
      },
    });

    // Log the activity
    await createActivityLog({
      userId: currentUser.id!,
      action: 'ASSIGN',
      entityType: 'ingredient',
      entityId: ingredient.id,
      entityName: ingredient.name,
      description: `Assigned vendor "${vendor.name}" to ingredient "${ingredient.name}"`,
      metadata: { ingredientId: ingredient.id, vendorId: vendor.id },
      bakeryId: ingredient.bakeryId,
    });

    revalidatePath('/dashboard/ingredients');
    revalidatePath(`/dashboard/ingredients/${ingredientId}`);

    return {
      success: true,
    };
  } catch (error) {
    console.error('Error assigning vendor to ingredient:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to assign vendor',
    };
  }
}

export async function unassignVendorFromIngredient(ingredientId: string, vendorId: string) {
  try {
    const currentUser = await getCurrentUser();

    if (!currentUser) {
      return {
        success: false,
        error: 'Unauthorized: You must be logged in',
      };
    }

    // Check if ingredient exists and user has access
    const ingredient = await db.ingredient.findUnique({
      where: { id: ingredientId },
    });

    if (!ingredient) {
      return {
        success: false,
        error: 'Ingredient not found',
      };
    }

    if (currentUser.bakeryId !== ingredient.bakeryId) {
      return {
        success: false,
        error: 'Unauthorized: You can only manage ingredients for your bakery',
      };
    }

    // Get vendor name for logging
    const vendor = await db.vendor.findUnique({
      where: { id: vendorId },
    });

    // Delete the assignment
    await db.ingredientVendor.delete({
      where: {
        ingredientId_vendorId: {
          ingredientId,
          vendorId,
        },
      },
    });

    // Log the activity
    if (vendor) {
      await createActivityLog({
        userId: currentUser.id!,
        action: 'REVOKE',
        entityType: 'ingredient',
        entityId: ingredient.id,
        entityName: ingredient.name,
        description: `Removed vendor "${vendor.name}" from ingredient "${ingredient.name}"`,
        metadata: { ingredientId: ingredient.id, vendorId: vendor.id },
        bakeryId: ingredient.bakeryId,
      });
    }

    revalidatePath('/dashboard/ingredients');
    revalidatePath(`/dashboard/ingredients/${ingredientId}`);

    return {
      success: true,
    };
  } catch (error) {
    console.error('Error unassigning vendor from ingredient:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to unassign vendor',
    };
  }
}
