'use server';

import { db } from '@/lib/db';
import { getCurrentUser } from '@/lib/clerk';
import { revalidatePath } from 'next/cache';
import { Decimal } from '@prisma/client/runtime/library';
import { Prisma } from '@/generated/prisma';
import {
  completeProductionSheetSchema,
  type CreateProductionSheetInput,
  type UpdateProductionSheetInput,
  type CompleteProductionSheetInput,
  type AddRecipeToSheetInput,
  type UpdateRecipeOnSheetInput,
  type RemoveRecipeFromSheetInput,
} from '@/lib/validations/productionSheet';
import { createActivityLog } from './activity';
import { convertQuantity } from '@/lib/unitConvert';
import {
  calculateFIFOUsage,
  type InventoryWithLots,
  type FIFOUsageResult,
} from '@/lib/inventory';
import {
  getProductionSheetIngredientRequirements,
  calculateTotalCost,
  type ProductionSheetRecipeEntry,
} from '@/lib/ingredientAggregation';
import { createProductionSheetSnapshot } from '@/lib/productionSheetSnapshot';
import {
  productionSheetSnapshotService,
  buildProductionSheetEntity,
} from '@/lib/snapshot';
import { actionContext, actionError, UNAUTHORIZED, type ActionResult } from '@/lib/services/action';
import * as sheets from '@/lib/services/productionSheet';
import type { InventoryWarning } from '@/lib/services/productionSheet';

type Sheet = Awaited<ReturnType<typeof sheets.updateProductionSheet>>;
type SheetRecipe = Awaited<ReturnType<typeof sheets.addRecipeToSheet>>;

function revalidateSheet(id?: string) {
  revalidatePath('/dashboard/production-sheets');
  if (id) revalidatePath(`/dashboard/production-sheets/${id}`);
}

/**
 * Create a new production sheet with multiple recipes
 * Returns warnings if inventory is insufficient (but still creates the production sheet)
 */
export async function createProductionSheet(
  data: CreateProductionSheetInput
): Promise<Omit<ActionResult<Sheet>, 'warnings'> & { warnings?: InventoryWarning[] }> {
  // Warnings here are structured inventory shortfalls, not strings.
  const failure = ({ error }: ActionResult) => ({ success: false, error });
  try {
    const ctx = await actionContext();
    if (!ctx) return failure(UNAUTHORIZED);
    const { sheet, warnings } = await sheets.createProductionSheet(ctx, data);
    revalidateSheet();
    return { success: true, data: sheet, warnings: warnings.length > 0 ? warnings : undefined };
  } catch (error) {
    return failure(actionError(error, 'Failed to create production sheet'));
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
        recipes: {
          include: {
            recipe: {
              select: {
                id: true,
                name: true,
                totalCost: true,
                yieldQty: true,
                yieldUnit: true,
              },
            },
          },
          orderBy: {
            order: 'asc',
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
      orderBy: [{ scheduledFor: 'asc' }, { createdAt: 'desc' }],
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
 * Get a single production sheet by ID with full recipe and ingredient details
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
        recipes: {
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
          },
          orderBy: {
            order: 'asc',
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
export async function updateProductionSheet(
  data: UpdateProductionSheetInput
): Promise<ActionResult<Sheet>> {
  try {
    const ctx = await actionContext();
    if (!ctx) return UNAUTHORIZED;
    const sheet = await sheets.updateProductionSheet(ctx, data.id, data);
    revalidateSheet(data.id);
    return { success: true, data: sheet };
  } catch (error) {
    return actionError(error, 'Failed to update production sheet');
  }
}

/**
 * Add a recipe to an existing production sheet
 */
export async function addRecipeToSheet(
  data: AddRecipeToSheetInput
): Promise<ActionResult<SheetRecipe>> {
  try {
    const ctx = await actionContext();
    if (!ctx) return UNAUTHORIZED;
    const entry = await sheets.addRecipeToSheet(ctx, data.productionSheetId, data);
    revalidateSheet(data.productionSheetId);
    return { success: true, data: entry };
  } catch (error) {
    return actionError(error, 'Failed to add recipe');
  }
}

/**
 * Update a recipe's scale or order on a production sheet
 */
export async function updateRecipeOnSheet(
  data: UpdateRecipeOnSheetInput
): Promise<ActionResult<SheetRecipe>> {
  try {
    const ctx = await actionContext();
    if (!ctx) return UNAUTHORIZED;
    const entry = await sheets.updateRecipeOnSheet(ctx, data.productionSheetId, data.recipeId, data);
    revalidateSheet(data.productionSheetId);
    return { success: true, data: entry };
  } catch (error) {
    return actionError(error, 'Failed to update recipe');
  }
}

/**
 * Remove a recipe from a production sheet
 */
export async function removeRecipeFromSheet(data: RemoveRecipeFromSheetInput): Promise<ActionResult> {
  try {
    const ctx = await actionContext();
    if (!ctx) return UNAUTHORIZED;
    await sheets.removeRecipeFromSheet(ctx, data.productionSheetId, data.recipeId);
    revalidateSheet(data.productionSheetId);
    return { success: true };
  } catch (error) {
    return actionError(error, 'Failed to remove recipe');
  }
}

/**
 * Complete a production sheet and deduct inventory using FIFO
 * Aggregates ingredients across all recipes before deducting
 */
export async function completeProductionSheet(data: CompleteProductionSheetInput) {
  try {
    const currentUser = await getCurrentUser();

    if (!currentUser) {
      return { success: false, error: 'Unauthorized: You must be logged in' };
    }

    // Validate input
    const validatedData = completeProductionSheetSchema.parse(data);

    // Get production sheet with all recipes and ingredients
    const productionSheet = await db.productionSheet.findUnique({
      where: { id: validatedData.id },
      include: {
        recipes: {
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
          orderBy: { order: 'asc' },
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

    // Build recipe entries for aggregation
    const recipeEntries: ProductionSheetRecipeEntry[] = productionSheet.recipes.map((r) => ({
      id: r.id,
      scale: r.scale,
      order: r.order,
      recipe: {
        id: r.recipe.id,
        name: r.recipe.name,
        yieldQty: r.recipe.yieldQty,
        yieldUnit: r.recipe.yieldUnit,
        totalCost: r.recipe.totalCost,
        sections: r.recipe.sections.map((s) => ({
          id: s.id,
          name: s.name,
          order: s.order,
          ingredients: s.ingredients.map((i) => ({
            id: i.id,
            quantity: i.quantity,
            unit: i.unit,
            ingredient: i.ingredient,
          })),
        })),
      },
    }));

    // Get aggregated ingredient requirements
    const ingredientRequirements = getProductionSheetIngredientRequirements(recipeEntries);

    // Build ingredient usage data with inventory
    const ingredientUsage: Array<{
      ingredientId: string;
      ingredientName: string;
      quantity: number;
      unit: string;
      inventory: InventoryWithLots | null;
      fifoResult: FIFOUsageResult | null;
    }> = [];

    for (const req of ingredientRequirements) {
      // Find inventory for this ingredient
      let inventoryForCalc: InventoryWithLots | null = null;

      for (const recipeEntry of productionSheet.recipes) {
        for (const section of recipeEntry.recipe.sections) {
          for (const recipeIngredient of section.ingredients) {
            if (recipeIngredient.ingredient.id === req.ingredientId) {
              const ingredient = recipeIngredient.ingredient;
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
                break;
              }
            }
          }
          if (inventoryForCalc) break;
        }
        if (inventoryForCalc) break;
      }

      // Calculate FIFO usage
      let fifoResult: FIFOUsageResult | null = null;
      if (inventoryForCalc) {
        fifoResult = calculateFIFOUsage(inventoryForCalc, req.requiredQuantity, req.requiredUnit);
      }

      ingredientUsage.push({
        ingredientId: req.ingredientId,
        ingredientName: req.ingredientName,
        quantity: req.requiredQuantity,
        unit: req.requiredUnit,
        inventory: inventoryForCalc,
        fifoResult,
      });
    }

    // Track shortfalls for response
    const shortfalls: Array<{
      ingredientName: string;
      required: number;
      available: number;
      shortfall: number;
      unit: string;
    }> = [];

    // Get recipe names for notes
    const recipeNames = productionSheet.recipes.map((r) => r.recipe.name).join(', ');

    // Create snapshot of current state before completing
    const snapshot = createProductionSheetSnapshot(recipeEntries);

    // Complete the production sheet and create inventory usages in a transaction
    const result = await db.$transaction(async (tx) => {
      // Mark production sheet as completed with snapshot
      const completedProductionSheet = await tx.productionSheet.update({
        where: { id: validatedData.id },
        data: {
          completed: true,
          completedAt: new Date(),
          completedBy: currentUser.id,
          snapshotData: JSON.parse(JSON.stringify(snapshot)) as Prisma.InputJsonValue,
        },
      });

      // Create inventory usages for each aggregated ingredient using FIFO
      const usages = [];
      for (const usage of ingredientUsage) {
        // Handle case where no inventory exists at all
        if (!usage.inventory || !usage.fifoResult) {
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
          const inventoryUsage = await tx.inventoryUsage.create({
            data: {
              lotId: lotUsage.lotId,
              quantity: new Decimal(lotUsage.quantity),
              shortfall: new Decimal(0),
              reason: 'USE',
              productionSheetId: productionSheet.id,
              createdBy: currentUser.id!,
              notes: `Used for production sheet: ${recipeNames}`,
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

        // If there's a shortfall, record it on the last usage
        if (fifoResult.hasShortfall && fifoResult.usages.length > 0) {
          const lastUsageId = usages[usages.length - 1].id;
          const lastLotUsage = fifoResult.usages[fifoResult.usages.length - 1];
          const shortfallInLotUnit =
            convertQuantity(fifoResult.shortfall, usage.inventory.displayUnit, lastLotUsage.lotUnit) ??
            fifoResult.shortfall;

          await tx.inventoryUsage.update({
            where: { id: lastUsageId },
            data: {
              shortfall: new Decimal(shortfallInLotUnit),
              notes: `Used for production sheet: ${recipeNames} (shortfall: ${fifoResult.shortfall.toFixed(3)} ${usage.inventory.displayUnit})`,
            },
          });
        }

        // If shortfall but no lots at all, create a usage record to track it
        if (fifoResult.hasShortfall && fifoResult.usages.length === 0) {
          const anyLot = await tx.inventoryLot.findFirst({
            where: { inventoryId: usage.inventory.id },
            orderBy: { purchasedAt: 'desc' },
          });

          if (anyLot) {
            const shortfallInLotUnit =
              convertQuantity(fifoResult.shortfall, usage.inventory.displayUnit, anyLot.purchaseUnit) ??
              fifoResult.shortfall;

            const shortfallUsage = await tx.inventoryUsage.create({
              data: {
                lotId: anyLot.id,
                quantity: new Decimal(0),
                shortfall: new Decimal(shortfallInLotUnit),
                reason: 'USE',
                productionSheetId: productionSheet.id,
                createdBy: currentUser.id!,
                notes: `Shortfall for production sheet: ${recipeNames} (needed ${fifoResult.shortfall.toFixed(3)} ${usage.inventory.displayUnit}, had none)`,
              },
            });
            usages.push(shortfallUsage);
          }
        }
      }

      return { completedProductionSheet, usages };
    });

    // Calculate total cost for logging
    const totalCost = calculateTotalCost(recipeEntries);

    // Log activity
    await createActivityLog({
      userId: currentUser.id!,
      action: 'UPDATE',
      entityType: 'production_sheet',
      entityId: productionSheet.id,
      entityName: productionSheet.description || recipeNames,
      description: `Completed production sheet with ${productionSheet.recipes.length} recipe(s) and deducted inventory from ${result.usages.length} lots${shortfalls.length > 0 ? ` (${shortfalls.length} shortfall(s))` : ''}`,
      metadata: {
        recipes: productionSheet.recipes.map((r) => ({
          recipeId: r.recipe.id,
          recipeName: r.recipe.name,
          scale: Number(r.scale),
        })),
        usageCount: result.usages.length,
        ingredientsUsed: ingredientUsage.map((u) => ({
          name: u.ingredientName,
          quantity: u.quantity,
          unit: u.unit,
          lotsAffected: u.fifoResult?.usages.length ?? 0,
          hasShortfall: u.fifoResult?.hasShortfall ?? false,
        })),
        totalCost,
        shortfalls: shortfalls.length > 0 ? shortfalls : undefined,
      },
      bakeryId: productionSheet.bakeryId,
    });

    // Create S3 snapshot for the completed production sheet (in addition to database snapshot)
    try {
      const entityForSnapshot = buildProductionSheetEntity({
        id: productionSheet.id,
        description: productionSheet.description,
        recipes: productionSheet.recipes.map((r) => ({
          id: r.id,
          scale: r.scale,
          order: r.order,
          recipe: {
            id: r.recipe.id,
            name: r.recipe.name,
            yieldQty: r.recipe.yieldQty,
            yieldUnit: r.recipe.yieldUnit,
            totalCost: r.recipe.totalCost,
            sections: r.recipe.sections.map((s) => ({
              id: s.id,
              name: s.name,
              order: s.order,
              ingredients: s.ingredients.map((i) => ({
                id: i.id,
                quantity: i.quantity,
                unit: i.unit,
                ingredient: i.ingredient,
              })),
            })),
          },
        })),
      });

      await productionSheetSnapshotService.createSnapshot(
        entityForSnapshot,
        productionSheet.bakeryId,
        productionSheet.id,
        productionSheet.description || recipeNames,
        'COMPLETE',
        currentUser.id
      );
    } catch (snapshotError) {
      // Log but don't fail the completion if S3 snapshot fails
      // The database snapshot is already saved
      console.error('Failed to create S3 production sheet snapshot:', snapshotError);
    }

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
 * Backfill snapshot data for existing completed production sheets
 * This should be run once after the migration to populate snapshot data
 * for production sheets that were completed before the snapshot feature was added
 */
export async function backfillProductionSheetSnapshots() {
  try {
    const currentUser = await getCurrentUser();

    if (!currentUser) {
      return { success: false, error: 'Unauthorized: You must be logged in' };
    }

    // Only platform admins can run this
    if (!currentUser.isPlatformAdmin) {
      return { success: false, error: 'Unauthorized: Only platform admins can run backfill' };
    }

    // Find all completed production sheets without snapshot data
    const sheetsToBackfill = await db.productionSheet.findMany({
      where: {
        completed: true,
        snapshotData: { equals: Prisma.DbNull },
      },
      include: {
        recipes: {
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
                  orderBy: { order: 'asc' },
                },
              },
            },
          },
          orderBy: { order: 'asc' },
        },
      },
    });

    if (sheetsToBackfill.length === 0) {
      return { success: true, message: 'No production sheets need backfilling', count: 0 };
    }

    let backfilledCount = 0;

    for (const sheet of sheetsToBackfill) {
      // Build recipe entries for snapshot creation
      const recipeEntries: ProductionSheetRecipeEntry[] = sheet.recipes.map((r) => ({
        id: r.id,
        scale: r.scale,
        order: r.order,
        recipe: {
          id: r.recipe.id,
          name: r.recipe.name,
          yieldQty: r.recipe.yieldQty,
          yieldUnit: r.recipe.yieldUnit,
          totalCost: r.recipe.totalCost,
          sections: r.recipe.sections.map((s) => ({
            id: s.id,
            name: s.name,
            order: s.order,
            ingredients: s.ingredients.map((i) => ({
              id: i.id,
              quantity: i.quantity,
              unit: i.unit,
              ingredient: i.ingredient,
            })),
          })),
        },
      }));

      // Create snapshot
      const snapshot = createProductionSheetSnapshot(recipeEntries);

      // Update the completedAt timestamp in the snapshot if available
      const sheetCompletedAt = (sheet as { completedAt: Date | null }).completedAt;
      if (sheetCompletedAt) {
        snapshot.completedAt = sheetCompletedAt.toISOString();
      }

      // Update the production sheet with the snapshot
      await db.productionSheet.update({
        where: { id: sheet.id },
        data: { snapshotData: JSON.parse(JSON.stringify(snapshot)) as Prisma.InputJsonValue },
      });

      backfilledCount++;
    }

    return {
      success: true,
      message: `Backfilled ${backfilledCount} production sheet(s)`,
      count: backfilledCount,
    };
  } catch (error) {
    console.error('Failed to backfill production sheet snapshots:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to backfill snapshots',
    };
  }
}

/**
 * Delete a production sheet
 */
export async function deleteProductionSheet(id: string): Promise<ActionResult> {
  try {
    const ctx = await actionContext();
    if (!ctx) return UNAUTHORIZED;
    await sheets.deleteProductionSheet(ctx, id);
    revalidateSheet();
    return { success: true };
  } catch (error) {
    return actionError(error, 'Failed to delete production sheet');
  }
}
