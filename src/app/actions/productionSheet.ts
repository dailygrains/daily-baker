'use server';

import { db } from '@/lib/db';
import { getCurrentUser } from '@/lib/clerk';
import { revalidatePath } from 'next/cache';
import { Decimal } from '@prisma/client/runtime/library';
import {
  createProductionSheetSchema,
  updateProductionSheetSchema,
  completeProductionSheetSchema,
  type CreateProductionSheetInput,
  type UpdateProductionSheetInput,
  type CompleteProductionSheetInput,
} from '@/lib/validations/productionSheet';
import { createActivityLog } from './activity';
import { convertQuantity } from '@/lib/unitConvert';
import {
  getTotalQuantity,
  calculateFIFOUsage,
  checkInventoryLevels,
  type InventoryWithLots,
  type FIFOUsageResult,
} from '@/lib/inventory';

/**
 * Create a new production sheet
 * Returns warnings if inventory is insufficient (but still creates the production sheet)
 */
export async function createProductionSheet(data: CreateProductionSheetInput) {
  try {
    const currentUser = await getCurrentUser();

    if (!currentUser) {
      return { success: false, error: 'Unauthorized: You must be logged in' };
    }

    // Validate input
    const validatedData = createProductionSheetSchema.parse(data);

    // Verify user belongs to the bakery
    if (currentUser.bakeryId !== validatedData.bakeryId) {
      return {
        success: false,
        error: 'Unauthorized: You can only create production sheets for your bakery',
      };
    }

    // Verify recipe exists and belongs to bakery, include ingredients for inventory check
    const recipe = await db.recipe.findUnique({
      where: { id: validatedData.recipeId },
      include: {
        sections: {
          include: {
            ingredients: {
              include: {
                ingredient: {
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
                },
              },
            },
          },
        },
      },
    });

    if (!recipe) {
      return { success: false, error: 'Recipe not found' };
    }

    if (recipe.bakeryId !== validatedData.bakeryId) {
      return {
        success: false,
        error: 'Unauthorized: Recipe does not belong to your bakery',
      };
    }

    // Check inventory levels and collect warnings
    const scale = validatedData.scale;
    const ingredientRequirements: Array<{
      ingredientId: string;
      ingredientName: string;
      requiredQuantity: number;
      requiredUnit: string;
      inventory: InventoryWithLots | null;
    }> = [];

    for (const section of recipe.sections) {
      for (const recipeIngredient of section.ingredients) {
        const scaledQuantity = Number(recipeIngredient.quantity) * scale;
        const ingredient = recipeIngredient.ingredient;

        let inventoryForCalc: InventoryWithLots | null = null;
        if (ingredient.inventory && ingredient.inventory.lots.length > 0) {
          inventoryForCalc = {
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
        }

        ingredientRequirements.push({
          ingredientId: ingredient.id,
          ingredientName: ingredient.name,
          requiredQuantity: scaledQuantity,
          requiredUnit: recipeIngredient.unit,
          inventory: inventoryForCalc,
        });
      }
    }

    const inventoryWarnings = checkInventoryLevels(ingredientRequirements);

    // Create production sheet (even if there are warnings)
    const productionSheet = await db.productionSheet.create({
      data: {
        bakeryId: validatedData.bakeryId,
        recipeId: validatedData.recipeId,
        scale: new Decimal(validatedData.scale),
        quantity: validatedData.quantity,
        notes: validatedData.notes || null,
        completed: false,
      },
    });

    // Log activity
    await createActivityLog({
      userId: currentUser.id,
      action: 'CREATE',
      entityType: 'production_sheet',
      entityId: productionSheet.id,
      entityName: `${validatedData.quantity} of ${recipe.name}`,
      description: `Created production sheet: ${validatedData.quantity} of "${recipe.name}" (scale: ${validatedData.scale}x)${inventoryWarnings.length > 0 ? ` (${inventoryWarnings.length} inventory warning(s))` : ''}`,
      metadata: {
        recipeId: recipe.id,
        recipeName: recipe.name,
        scale: validatedData.scale,
        quantity: validatedData.quantity,
        inventoryWarnings: inventoryWarnings.length > 0 ? inventoryWarnings : undefined,
      },
      bakeryId: validatedData.bakeryId,
    });

    revalidatePath('/dashboard/production-sheets');

    return {
      success: true,
      data: productionSheet,
      warnings: inventoryWarnings.length > 0 ? inventoryWarnings : undefined,
    };
  } catch (error) {
    console.error('Failed to create production sheet:', error);
    return {
      success: false,
      error:
        error instanceof Error ? error.message : 'Failed to create production sheet',
    };
  }
}

/**
 * Get all production sheets for a bakery
 */
export async function getProductionSheetsByBakery(bakeryId: string) {
  try {
    const currentUser = await getCurrentUser();

    if (!currentUser) {
      return { success: false, error: 'Unauthorized: You must be logged in' };
    }

    // Verify user belongs to the bakery
    if (currentUser.bakeryId !== bakeryId) {
      return {
        success: false,
        error: 'Unauthorized: You can only view your bakery production sheets',
      };
    }

    const productionSheets = await db.productionSheet.findMany({
      where: { bakeryId },
      include: {
        recipe: {
          select: {
            id: true,
            name: true,
            totalCost: true,
          },
        },
        completer: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    return { success: true, data: productionSheets };
  } catch (error) {
    console.error('Failed to fetch production sheets:', error);
    return {
      success: false,
      error:
        error instanceof Error ? error.message : 'Failed to fetch production sheets',
    };
  }
}

/**
 * Get a single production sheet by ID
 */
export async function getProductionSheetById(id: string) {
  try {
    const currentUser = await getCurrentUser();

    if (!currentUser) {
      return { success: false, error: 'Unauthorized: You must be logged in' };
    }

    const productionSheet = await db.productionSheet.findUnique({
      where: { id },
      include: {
        recipe: {
          include: {
            sections: {
              include: {
                ingredients: {
                  include: {
                    ingredient: {
                      select: {
                        id: true,
                        name: true,
                        unit: true,
                      },
                    },
                  },
                },
              },
              orderBy: {
                order: 'asc',
              },
            },
          },
        },
        completer: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
        usages: {
          include: {
            lot: {
              include: {
                inventory: {
                  include: {
                    ingredient: {
                      select: {
                        id: true,
                        name: true,
                        unit: true,
                      },
                    },
                  },
                },
              },
            },
            creator: {
              select: {
                id: true,
                name: true,
              },
            },
          },
          orderBy: {
            createdAt: 'asc',
          },
        },
      },
    });

    if (!productionSheet) {
      return { success: false, error: 'Production sheet not found' };
    }

    // Verify user belongs to the bakery
    if (currentUser.bakeryId !== productionSheet.bakeryId) {
      return {
        success: false,
        error: 'Unauthorized: Production sheet does not belong to your bakery',
      };
    }

    return { success: true, data: productionSheet };
  } catch (error) {
    console.error('Failed to fetch production sheet:', error);
    return {
      success: false,
      error:
        error instanceof Error ? error.message : 'Failed to fetch production sheet',
    };
  }
}

/**
 * Update a production sheet
 */
export async function updateProductionSheet(data: UpdateProductionSheetInput) {
  try {
    const currentUser = await getCurrentUser();

    if (!currentUser) {
      return { success: false, error: 'Unauthorized: You must be logged in' };
    }

    // Validate input
    const validatedData = updateProductionSheetSchema.parse(data);

    // Get existing production sheet
    const existingProductionSheet = await db.productionSheet.findUnique({
      where: { id: validatedData.id },
      select: {
        bakeryId: true,
        completed: true,
      },
    });

    if (!existingProductionSheet) {
      return { success: false, error: 'Production sheet not found' };
    }

    // Verify user belongs to the bakery
    if (currentUser.bakeryId !== existingProductionSheet.bakeryId) {
      return {
        success: false,
        error: 'Unauthorized: Production sheet does not belong to your bakery',
      };
    }

    // Cannot update completed production sheet
    if (existingProductionSheet.completed) {
      return {
        success: false,
        error: 'Cannot update a completed production sheet',
      };
    }

    // Prepare update data
    const updateData: {
      scale?: Decimal;
      quantity?: string;
      notes?: string | null;
    } = {};
    if (validatedData.scale !== undefined) {
      updateData.scale = new Decimal(validatedData.scale);
    }
    if (validatedData.quantity !== undefined) {
      updateData.quantity = validatedData.quantity;
    }
    if (validatedData.notes !== undefined) {
      updateData.notes = validatedData.notes;
    }

    // Update production sheet
    const productionSheet = await db.productionSheet.update({
      where: { id: validatedData.id },
      data: updateData,
    });

    // Log activity
    await createActivityLog({
      userId: currentUser.id,
      action: 'UPDATE',
      entityType: 'production_sheet',
      entityId: productionSheet.id,
      entityName: `Production sheet ${validatedData.id.substring(0, 8)}`,
      description: `Updated production sheet`,
      bakeryId: existingProductionSheet.bakeryId,
    });

    revalidatePath('/dashboard/production-sheets');
    revalidatePath(`/dashboard/production-sheets/${validatedData.id}`);

    return {
      success: true,
      data: productionSheet,
    };
  } catch (error) {
    console.error('Failed to update production sheet:', error);
    return {
      success: false,
      error:
        error instanceof Error ? error.message : 'Failed to update production sheet',
    };
  }
}

/**
 * Complete a production sheet and deduct inventory using FIFO
 * Allows completion even with insufficient inventory - tracks shortfall
 */
export async function completeProductionSheet(data: CompleteProductionSheetInput) {
  try {
    const currentUser = await getCurrentUser();

    if (!currentUser) {
      return { success: false, error: 'Unauthorized: You must be logged in' };
    }

    // Validate input
    const validatedData = completeProductionSheetSchema.parse(data);

    // Get production sheet with recipe and ingredients
    const productionSheet = await db.productionSheet.findUnique({
      where: { id: validatedData.id },
      include: {
        recipe: {
          include: {
            sections: {
              include: {
                ingredients: {
                  include: {
                    ingredient: {
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
                    },
                  },
                },
              },
            },
          },
        },
      },
    });

    if (!productionSheet) {
      return { success: false, error: 'Production sheet not found' };
    }

    // Verify user belongs to the bakery
    if (currentUser.bakeryId !== productionSheet.bakeryId) {
      return {
        success: false,
        error: 'Unauthorized: Production sheet does not belong to your bakery',
      };
    }

    // Check if already completed
    if (productionSheet.completed) {
      return {
        success: false,
        error: 'Production sheet is already completed',
      };
    }

    // Calculate scaled ingredient quantities
    const scale = Number(productionSheet.scale);
    const ingredientUsage: Array<{
      ingredientId: string;
      ingredientName: string;
      quantity: number;
      unit: string;
      inventory: InventoryWithLots | null;
      fifoResult: FIFOUsageResult | null;
    }> = [];

    for (const section of productionSheet.recipe.sections) {
      for (const recipeIngredient of section.ingredients) {
        const scaledQuantity = Number(recipeIngredient.quantity) * scale;
        const ingredient = recipeIngredient.ingredient;

        // Build inventory for calculation
        let inventoryForCalc: InventoryWithLots | null = null;
        if (ingredient.inventory && ingredient.inventory.lots.length > 0) {
          inventoryForCalc = {
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
        }

        // Calculate FIFO usage (now always returns a result, with shortfall info)
        let fifoResult: FIFOUsageResult | null = null;
        if (inventoryForCalc) {
          fifoResult = calculateFIFOUsage(
            inventoryForCalc,
            scaledQuantity,
            recipeIngredient.unit
          );
        }

        ingredientUsage.push({
          ingredientId: ingredient.id,
          ingredientName: ingredient.name,
          quantity: scaledQuantity,
          unit: recipeIngredient.unit,
          inventory: inventoryForCalc,
          fifoResult,
        });
      }
    }

    // Track shortfalls for response
    const shortfalls: Array<{
      ingredientName: string;
      required: number;
      available: number;
      shortfall: number;
      unit: string;
    }> = [];

    // Complete the production sheet and create inventory usages in a database transaction
    const result = await db.$transaction(async (tx) => {
      // Mark production sheet as completed
      const completedProductionSheet = await tx.productionSheet.update({
        where: { id: validatedData.id },
        data: {
          completed: true,
          completedAt: new Date(),
          completedBy: currentUser.id,
        },
      });

      // Create inventory usages for each ingredient using FIFO
      const usages = [];
      for (const usage of ingredientUsage) {
        // Handle case where no inventory exists at all
        if (!usage.inventory || !usage.fifoResult) {
          // No inventory to deduct from - record the full shortfall
          shortfalls.push({
            ingredientName: usage.ingredientName,
            required: usage.quantity,
            available: 0,
            shortfall: usage.quantity,
            unit: usage.unit,
          });
          continue;
        }

        const fifoResult = usage.fifoResult;

        // Track shortfall if any
        if (fifoResult.hasShortfall) {
          shortfalls.push({
            ingredientName: usage.ingredientName,
            required: fifoResult.totalRequested,
            available: fifoResult.totalFulfilled,
            shortfall: fifoResult.shortfall,
            unit: usage.inventory.displayUnit,
          });
        }

        // Create usage records for what we could actually deduct
        for (const lotUsage of fifoResult.usages) {
          // Create usage record
          const inventoryUsage = await tx.inventoryUsage.create({
            data: {
              lotId: lotUsage.lotId,
              quantity: new Decimal(lotUsage.quantity),
              shortfall: new Decimal(0), // No shortfall on individual lot usage
              reason: 'USE',
              productionSheetId: productionSheet.id,
              createdBy: currentUser.id,
              notes: `Used for production sheet: ${productionSheet.quantity} of ${productionSheet.recipe.name}`,
            },
          });

          // Update lot's remaining quantity
          await tx.inventoryLot.update({
            where: { id: lotUsage.lotId },
            data: {
              remainingQty: {
                decrement: new Decimal(lotUsage.quantity),
              },
            },
          });

          usages.push(inventoryUsage);
        }

        // If there's a shortfall and we have at least one lot, record it on the last usage
        // This links the shortfall to the production sheet for tracking
        if (fifoResult.hasShortfall && fifoResult.usages.length > 0) {
          // Update the last usage to include the shortfall amount
          const lastUsageId = usages[usages.length - 1].id;

          // Convert shortfall from display unit to lot's unit for the last lot used
          const lastLotUsage = fifoResult.usages[fifoResult.usages.length - 1];
          const shortfallInLotUnit = convertQuantity(
            fifoResult.shortfall,
            usage.inventory.displayUnit,
            lastLotUsage.lotUnit
          ) ?? fifoResult.shortfall;

          await tx.inventoryUsage.update({
            where: { id: lastUsageId },
            data: {
              shortfall: new Decimal(shortfallInLotUnit),
              notes: `Used for production sheet: ${productionSheet.quantity} of ${productionSheet.recipe.name} (shortfall: ${fifoResult.shortfall.toFixed(3)} ${usage.inventory.displayUnit})`,
            },
          });
        }

        // If there's a shortfall but no lots at all (zero inventory), create a usage record just to track it
        if (fifoResult.hasShortfall && fifoResult.usages.length === 0) {
          // We need at least one lot to attach the usage to - get the first lot even if empty
          const anyLot = await tx.inventoryLot.findFirst({
            where: { inventoryId: usage.inventory.id },
            orderBy: { purchasedAt: 'desc' },
          });

          if (anyLot) {
            const shortfallInLotUnit = convertQuantity(
              fifoResult.shortfall,
              usage.inventory.displayUnit,
              anyLot.purchaseUnit
            ) ?? fifoResult.shortfall;

            const shortfallUsage = await tx.inventoryUsage.create({
              data: {
                lotId: anyLot.id,
                quantity: new Decimal(0), // Nothing actually deducted
                shortfall: new Decimal(shortfallInLotUnit),
                reason: 'USE',
                productionSheetId: productionSheet.id,
                createdBy: currentUser.id,
                notes: `Shortfall for production sheet: ${productionSheet.quantity} of ${productionSheet.recipe.name} (needed ${fifoResult.shortfall.toFixed(3)} ${usage.inventory.displayUnit}, had none)`,
              },
            });
            usages.push(shortfallUsage);
          }
        }
      }

      return { completedProductionSheet, usages };
    });

    // Log activity
    await createActivityLog({
      userId: currentUser.id,
      action: 'UPDATE',
      entityType: 'production_sheet',
      entityId: productionSheet.id,
      entityName: `${productionSheet.quantity} of ${productionSheet.recipe.name}`,
      description: `Completed production sheet: ${productionSheet.quantity} of "${productionSheet.recipe.name}" and deducted inventory from ${result.usages.length} lots${shortfalls.length > 0 ? ` (${shortfalls.length} shortfall(s))` : ''}`,
      metadata: {
        recipeId: productionSheet.recipe.id,
        recipeName: productionSheet.recipe.name,
        scale: scale,
        quantity: productionSheet.quantity,
        usageCount: result.usages.length,
        ingredientsUsed: ingredientUsage.map((u) => ({
          name: u.ingredientName,
          quantity: u.quantity,
          unit: u.unit,
          lotsAffected: u.fifoResult?.usages.length ?? 0,
          hasShortfall: u.fifoResult?.hasShortfall ?? false,
        })),
        shortfalls: shortfalls.length > 0 ? shortfalls : undefined,
      },
      bakeryId: productionSheet.bakeryId,
    });

    revalidatePath('/dashboard/production-sheets');
    revalidatePath(`/dashboard/production-sheets/${validatedData.id}`);
    revalidatePath('/dashboard/ingredients');

    return {
      success: true,
      data: result.completedProductionSheet,
      usagesCreated: result.usages.length,
      shortfalls: shortfalls.length > 0 ? shortfalls : undefined,
    };
  } catch (error) {
    console.error('Failed to complete production sheet:', error);
    return {
      success: false,
      error:
        error instanceof Error ? error.message : 'Failed to complete production sheet',
    };
  }
}

/**
 * Delete a production sheet
 */
export async function deleteProductionSheet(id: string) {
  try {
    const currentUser = await getCurrentUser();

    if (!currentUser) {
      return { success: false, error: 'Unauthorized: You must be logged in' };
    }

    // Get production sheet
    const productionSheet = await db.productionSheet.findUnique({
      where: { id },
      select: {
        bakeryId: true,
        completed: true,
        quantity: true,
        recipe: {
          select: {
            name: true,
          },
        },
      },
    });

    if (!productionSheet) {
      return { success: false, error: 'Production sheet not found' };
    }

    // Verify user belongs to the bakery
    if (currentUser.bakeryId !== productionSheet.bakeryId) {
      return {
        success: false,
        error: 'Unauthorized: Production sheet does not belong to your bakery',
      };
    }

    // Cannot delete completed production sheet
    if (productionSheet.completed) {
      return {
        success: false,
        error: 'Cannot delete a completed production sheet',
      };
    }

    // Delete production sheet
    await db.productionSheet.delete({
      where: { id },
    });

    // Log activity
    await createActivityLog({
      userId: currentUser.id,
      action: 'DELETE',
      entityType: 'production_sheet',
      entityId: id,
      entityName: `${productionSheet.quantity} of ${productionSheet.recipe.name}`,
      description: `Deleted production sheet: ${productionSheet.quantity} of "${productionSheet.recipe.name}"`,
      bakeryId: productionSheet.bakeryId,
    });

    revalidatePath('/dashboard/production-sheets');

    return { success: true };
  } catch (error) {
    console.error('Failed to delete production sheet:', error);
    return {
      success: false,
      error:
        error instanceof Error ? error.message : 'Failed to delete production sheet',
    };
  }
}
