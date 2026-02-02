'use server';

import { db } from '@/lib/db';
import { getCurrentUser } from '@/lib/clerk';
import { revalidatePath } from 'next/cache';
import { Decimal } from '@prisma/client/runtime/library';
import {
  createProductionSheetSchema,
  updateProductionSheetSchema,
  completeProductionSheetSchema,
  deleteProductionSheetSchema,
  addRecipeToSheetSchema,
  updateRecipeOnSheetSchema,
  removeRecipeFromSheetSchema,
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
  checkInventoryLevels,
  type InventoryWithLots,
  type FIFOUsageResult,
} from '@/lib/inventory';
import {
  getProductionSheetIngredientRequirements,
  calculateTotalCost,
  type ProductionSheetRecipeEntry,
} from '@/lib/ingredientAggregation';

// Helper to build recipe include for inventory checking
const recipeWithIngredientsInclude = {
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
                    orderBy: { purchasedAt: 'asc' as const },
                  },
                },
              },
            },
          },
        },
      },
    },
  },
};

/**
 * Create a new production sheet with multiple recipes
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

    // Fetch all recipes with their ingredients for inventory check
    const recipeIds = validatedData.recipes.map((r) => r.recipeId);
    const recipes = await db.recipe.findMany({
      where: {
        id: { in: recipeIds },
        bakeryId: validatedData.bakeryId,
      },
      include: recipeWithIngredientsInclude,
    });

    // Verify all recipes exist and belong to bakery
    if (recipes.length !== recipeIds.length) {
      const foundIds = new Set(recipes.map((r) => r.id));
      const missingIds = recipeIds.filter((id) => !foundIds.has(id));
      return {
        success: false,
        error: `Recipe(s) not found or don't belong to your bakery: ${missingIds.join(', ')}`,
      };
    }

    // Build recipe entries for ingredient aggregation
    const recipeEntries: ProductionSheetRecipeEntry[] = validatedData.recipes.map(
      (r, idx) => {
        const recipe = recipes.find((rec) => rec.id === r.recipeId)!;
        return {
          id: '', // Will be created
          scale: r.scale,
          order: r.order ?? idx,
          recipe: {
            id: recipe.id,
            name: recipe.name,
            yieldQty: recipe.yieldQty,
            yieldUnit: recipe.yieldUnit,
            totalCost: recipe.totalCost,
            sections: recipe.sections.map((s) => ({
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
        };
      }
    );

    // Get aggregated ingredient requirements for inventory check
    const ingredientRequirements = getProductionSheetIngredientRequirements(recipeEntries);

    // Build inventory data for checking
    const ingredientReqsWithInventory = ingredientRequirements.map((req) => {
      // Find the ingredient across all recipes to get inventory
      let inventoryForCalc: InventoryWithLots | null = null;

      for (const recipe of recipes) {
        for (const section of recipe.sections) {
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

      return {
        ingredientId: req.ingredientId,
        ingredientName: req.ingredientName,
        requiredQuantity: req.requiredQuantity,
        requiredUnit: req.requiredUnit,
        inventory: inventoryForCalc,
      };
    });

    const inventoryWarnings = checkInventoryLevels(ingredientReqsWithInventory);

    // Create production sheet with recipes in a transaction
    const productionSheet = await db.$transaction(async (tx) => {
      const sheet = await tx.productionSheet.create({
        data: {
          bakeryId: validatedData.bakeryId,
          description: validatedData.description || null,
          scheduledFor: validatedData.scheduledFor || null,
          notes: validatedData.notes || null,
          completed: false,
        },
      });

      // Create recipe entries
      await tx.productionSheetRecipe.createMany({
        data: validatedData.recipes.map((r, idx) => ({
          productionSheetId: sheet.id,
          recipeId: r.recipeId,
          scale: new Decimal(r.scale),
          order: r.order ?? idx,
        })),
      });

      return sheet;
    });

    // Get recipe names for logging
    const recipeNames = recipes.map((r) => r.name).join(', ');

    // Log activity
    await createActivityLog({
      userId: currentUser.id!,
      action: 'CREATE',
      entityType: 'production_sheet',
      entityId: productionSheet.id,
      entityName: validatedData.description || `${recipes.length} recipe(s)`,
      description: `Created production sheet with ${recipes.length} recipe(s): ${recipeNames}${inventoryWarnings.length > 0 ? ` (${inventoryWarnings.length} inventory warning(s))` : ''}`,
      metadata: {
        recipes: validatedData.recipes,
        recipeNames,
        scheduledFor: validatedData.scheduledFor,
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

    // If recipes are being updated, verify they all belong to the bakery
    if (validatedData.recipes) {
      const recipeIds = validatedData.recipes.map((r) => r.recipeId);
      const recipes = await db.recipe.findMany({
        where: {
          id: { in: recipeIds },
          bakeryId: existingProductionSheet.bakeryId,
        },
        select: { id: true },
      });

      if (recipes.length !== recipeIds.length) {
        return {
          success: false,
          error: 'One or more recipes not found or do not belong to your bakery',
        };
      }
    }

    // Update production sheet in a transaction
    const productionSheet = await db.$transaction(async (tx) => {
      // Update main sheet data
      const sheet = await tx.productionSheet.update({
        where: { id: validatedData.id },
        data: {
          description: validatedData.description,
          scheduledFor: validatedData.scheduledFor,
          notes: validatedData.notes,
        },
      });

      // If recipes are being updated, replace them all
      if (validatedData.recipes) {
        // Delete existing recipe entries
        await tx.productionSheetRecipe.deleteMany({
          where: { productionSheetId: validatedData.id },
        });

        // Create new recipe entries
        await tx.productionSheetRecipe.createMany({
          data: validatedData.recipes.map((r, idx) => ({
            productionSheetId: validatedData.id,
            recipeId: r.recipeId,
            scale: new Decimal(r.scale),
            order: r.order ?? idx,
          })),
        });
      }

      return sheet;
    });

    // Log activity
    await createActivityLog({
      userId: currentUser.id!,
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
 * Add a recipe to an existing production sheet
 */
export async function addRecipeToSheet(data: AddRecipeToSheetInput) {
  try {
    const currentUser = await getCurrentUser();

    if (!currentUser) {
      return { success: false, error: 'Unauthorized: You must be logged in' };
    }

    const validatedData = addRecipeToSheetSchema.parse(data);

    // Get production sheet
    const productionSheet = await db.productionSheet.findUnique({
      where: { id: validatedData.productionSheetId },
      select: {
        bakeryId: true,
        completed: true,
        recipes: { select: { order: true } },
      },
    });

    if (!productionSheet) {
      return { success: false, error: 'Production sheet not found' };
    }

    if (currentUser.bakeryId !== productionSheet.bakeryId) {
      return { success: false, error: 'Unauthorized' };
    }

    if (productionSheet.completed) {
      return { success: false, error: 'Cannot modify a completed production sheet' };
    }

    // Verify recipe belongs to bakery
    const recipe = await db.recipe.findUnique({
      where: { id: validatedData.recipeId },
      select: { bakeryId: true, name: true },
    });

    if (!recipe || recipe.bakeryId !== productionSheet.bakeryId) {
      return { success: false, error: 'Recipe not found or does not belong to your bakery' };
    }

    // Calculate next order
    const maxOrder = Math.max(0, ...productionSheet.recipes.map((r) => r.order));

    // Add recipe to sheet
    const entry = await db.productionSheetRecipe.create({
      data: {
        productionSheetId: validatedData.productionSheetId,
        recipeId: validatedData.recipeId,
        scale: new Decimal(validatedData.scale),
        order: maxOrder + 1,
      },
    });

    revalidatePath(`/dashboard/production-sheets/${validatedData.productionSheetId}`);
    revalidatePath('/dashboard/production-sheets');

    return { success: true, data: entry };
  } catch (error) {
    console.error('Failed to add recipe to sheet:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to add recipe',
    };
  }
}

/**
 * Update a recipe's scale or order on a production sheet
 */
export async function updateRecipeOnSheet(data: UpdateRecipeOnSheetInput) {
  try {
    const currentUser = await getCurrentUser();

    if (!currentUser) {
      return { success: false, error: 'Unauthorized: You must be logged in' };
    }

    const validatedData = updateRecipeOnSheetSchema.parse(data);

    // Get production sheet
    const productionSheet = await db.productionSheet.findUnique({
      where: { id: validatedData.productionSheetId },
      select: { bakeryId: true, completed: true },
    });

    if (!productionSheet) {
      return { success: false, error: 'Production sheet not found' };
    }

    if (currentUser.bakeryId !== productionSheet.bakeryId) {
      return { success: false, error: 'Unauthorized' };
    }

    if (productionSheet.completed) {
      return { success: false, error: 'Cannot modify a completed production sheet' };
    }

    // Build update data
    const updateData: { scale?: Decimal; order?: number } = {};
    if (validatedData.scale !== undefined) {
      updateData.scale = new Decimal(validatedData.scale);
    }
    if (validatedData.order !== undefined) {
      updateData.order = validatedData.order;
    }

    // Update the recipe entry
    const entry = await db.productionSheetRecipe.update({
      where: {
        productionSheetId_recipeId: {
          productionSheetId: validatedData.productionSheetId,
          recipeId: validatedData.recipeId,
        },
      },
      data: updateData,
    });

    revalidatePath(`/dashboard/production-sheets/${validatedData.productionSheetId}`);
    revalidatePath('/dashboard/production-sheets');

    return { success: true, data: entry };
  } catch (error) {
    console.error('Failed to update recipe on sheet:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to update recipe',
    };
  }
}

/**
 * Remove a recipe from a production sheet
 */
export async function removeRecipeFromSheet(data: RemoveRecipeFromSheetInput) {
  try {
    const currentUser = await getCurrentUser();

    if (!currentUser) {
      return { success: false, error: 'Unauthorized: You must be logged in' };
    }

    const validatedData = removeRecipeFromSheetSchema.parse(data);

    // Get production sheet with recipe count
    const productionSheet = await db.productionSheet.findUnique({
      where: { id: validatedData.productionSheetId },
      select: {
        bakeryId: true,
        completed: true,
        _count: { select: { recipes: true } },
      },
    });

    if (!productionSheet) {
      return { success: false, error: 'Production sheet not found' };
    }

    if (currentUser.bakeryId !== productionSheet.bakeryId) {
      return { success: false, error: 'Unauthorized' };
    }

    if (productionSheet.completed) {
      return { success: false, error: 'Cannot modify a completed production sheet' };
    }

    // Must have at least one recipe
    if (productionSheet._count.recipes <= 1) {
      return { success: false, error: 'Production sheet must have at least one recipe' };
    }

    // Remove recipe from sheet
    await db.productionSheetRecipe.delete({
      where: {
        productionSheetId_recipeId: {
          productionSheetId: validatedData.productionSheetId,
          recipeId: validatedData.recipeId,
        },
      },
    });

    revalidatePath(`/dashboard/production-sheets/${validatedData.productionSheetId}`);
    revalidatePath('/dashboard/production-sheets');

    return { success: true };
  } catch (error) {
    console.error('Failed to remove recipe from sheet:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to remove recipe',
    };
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

    // Complete the production sheet and create inventory usages in a transaction
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
        description: true,
        recipes: {
          include: {
            recipe: {
              select: { name: true },
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

    // Cannot delete completed production sheet
    if (productionSheet.completed) {
      return {
        success: false,
        error: 'Cannot delete a completed production sheet',
      };
    }

    const recipeNames = productionSheet.recipes.map((r) => r.recipe.name).join(', ');

    // Delete production sheet (cascade will delete recipe entries)
    await db.productionSheet.delete({
      where: { id },
    });

    // Log activity
    await createActivityLog({
      userId: currentUser.id!,
      action: 'DELETE',
      entityType: 'production_sheet',
      entityId: id,
      entityName: productionSheet.description || recipeNames,
      description: `Deleted production sheet: ${productionSheet.description || recipeNames}`,
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
