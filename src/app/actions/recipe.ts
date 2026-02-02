'use server';

import { db } from '@/lib/db';
import { getCurrentUser } from '@/lib/clerk';
import { createActivityLog } from './activity';
import {
  createRecipeSchema,
  updateRecipeSchema,
  type CreateRecipeInput,
  type UpdateRecipeInput,
} from '@/lib/validations/recipe';
import { ZodError } from 'zod';

/**
 * Format Zod validation errors into a user-friendly message
 */
function formatZodError(error: ZodError): string {
  return error.issues
    .map((issue) => issue.message)
    .join('. ');
}
import { revalidatePath } from 'next/cache';
import { Decimal } from '@prisma/client/runtime/library';
import { convertQuantity } from '@/lib/unitConvert';
import { getWeightedAverageCost, type InventoryWithLots } from '@/lib/inventory';

/**
 * Calculate total cost of a recipe based on ingredients
 * Uses weighted average cost from FIFO lot-based inventory
 */
async function calculateRecipeCost(
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

          costPerUnit = getWeightedAverageCost(inventoryForCalc);
          displayUnit = ingredient.inventory.displayUnit;
        }

        // Convert quantity to display unit if necessary
        let adjustedQuantity = ing.quantity;
        if (ing.unit !== displayUnit) {
          const converted = convertQuantity(
            ing.quantity,
            ing.unit,
            displayUnit
          );

          if (converted !== null) {
            adjustedQuantity = converted;
          } else {
            // If conversion fails, log warning and use original quantity
            console.warn(
              `Cannot convert from ${ing.unit} to ${displayUnit} for ingredient cost calculation`
            );
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

/**
 * Create a new recipe
 */
export async function createRecipe(data: CreateRecipeInput) {
  try {
    const currentUser = await getCurrentUser();

    if (!currentUser) {
      return { success: false, error: 'Unauthorized: You must be logged in' };
    }

    // Verify user belongs to the bakery
    if (currentUser.bakeryId !== data.bakeryId) {
      return {
        success: false,
        error: 'Unauthorized: You can only create recipes for your bakery',
      };
    }

    // Validate input
    const validatedData = createRecipeSchema.parse(data);

    // Calculate total cost
    const totalCost = await calculateRecipeCost(validatedData.sections);

    // Create recipe with nested sections and ingredients
    const recipe = await db.recipe.create({
      data: {
        bakeryId: validatedData.bakeryId,
        name: validatedData.name,
        description: validatedData.description || null,
        yieldQty: validatedData.yieldQty,
        yieldUnit: validatedData.yieldUnit,
        totalCost: new Decimal(totalCost),
        sections: {
          create: validatedData.sections.map((section) => ({
            name: section.name,
            order: section.order,
            instructions: section.instructions,
            ingredients: {
              create: section.ingredients.map((ing) => ({
                ingredientId: ing.ingredientId,
                quantity: new Decimal(ing.quantity),
                unit: ing.unit,
              })),
            },
          })),
        },
      },
      include: {
        sections: {
          include: {
            ingredients: {
              include: {
                ingredient: true,
              },
            },
          },
        },
      },
    });

    // Log activity
    await createActivityLog({
      userId: currentUser.id!,
      action: 'CREATE',
      entityType: 'recipe',
      entityId: recipe.id,
      entityName: recipe.name,
      description: `Created recipe "${recipe.name}"`,
      metadata: {
        recipeId: recipe.id,
        yield: `${recipe.yieldQty} ${recipe.yieldUnit}`,
        sectionCount: recipe.sections.length,
      },
      bakeryId: recipe.bakeryId,
    });

    revalidatePath('/dashboard/recipes');
    return { success: true };
  } catch (error) {
    console.error('Failed to create recipe:', error);
    if (error instanceof ZodError) {
      return { success: false, error: formatZodError(error) };
    }
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to create recipe',
    };
  }
}

/**
 * Update an existing recipe
 */
export async function updateRecipe(data: UpdateRecipeInput) {
  try {
    const currentUser = await getCurrentUser();

    if (!currentUser) {
      return { success: false, error: 'Unauthorized: You must be logged in' };
    }

    // Validate input
    const validatedData = updateRecipeSchema.parse(data);

    // Fetch existing recipe to verify ownership
    const existingRecipe = await db.recipe.findUnique({
      where: { id: validatedData.id },
      select: { bakeryId: true, name: true },
    });

    if (!existingRecipe) {
      return { success: false, error: 'Recipe not found' };
    }

    // Verify user belongs to the same bakery
    if (currentUser.bakeryId !== existingRecipe.bakeryId) {
      return {
        success: false,
        error: 'Unauthorized: You can only update recipes for your bakery',
      };
    }

    // If sections are being updated, recalculate cost
    let totalCost: number | undefined;
    if (validatedData.sections) {
      totalCost = await calculateRecipeCost(validatedData.sections);

      // Delete existing sections (cascade will delete ingredients)
      await db.recipeSection.deleteMany({
        where: { recipeId: validatedData.id },
      });
    }

    // Update recipe
    const recipe = await db.recipe.update({
      where: { id: validatedData.id },
      data: {
        name: validatedData.name,
        description: validatedData.description,
        yieldQty: validatedData.yieldQty,
        yieldUnit: validatedData.yieldUnit,
        ...(totalCost !== undefined && { totalCost: new Decimal(totalCost) }),
        ...(validatedData.sections && {
          sections: {
            create: validatedData.sections.map((section) => ({
              name: section.name,
              order: section.order,
              instructions: section.instructions,
              ingredients: {
                create: section.ingredients.map((ing) => ({
                  ingredientId: ing.ingredientId,
                  quantity: new Decimal(ing.quantity),
                  unit: ing.unit,
                })),
              },
            })),
          },
        }),
      },
      include: {
        sections: {
          include: {
            ingredients: {
              include: {
                ingredient: true,
              },
            },
          },
        },
      },
    });

    // Log activity
    await createActivityLog({
      userId: currentUser.id!,
      action: 'UPDATE',
      entityType: 'recipe',
      entityId: recipe.id,
      entityName: recipe.name,
      description: `Updated recipe "${recipe.name}"`,
      metadata: {
        recipeId: recipe.id,
        changes: validatedData,
      },
      bakeryId: recipe.bakeryId,
    });

    revalidatePath('/dashboard/recipes');
    revalidatePath(`/dashboard/recipes/${recipe.id}`);
    return { success: true };
  } catch (error) {
    console.error('Failed to update recipe:', error);
    if (error instanceof ZodError) {
      return { success: false, error: formatZodError(error) };
    }
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to update recipe',
    };
  }
}

/**
 * Delete a recipe
 */
export async function deleteRecipe(id: string) {
  try {
    const currentUser = await getCurrentUser();

    if (!currentUser) {
      return { success: false, error: 'Unauthorized: You must be logged in' };
    }

    // Fetch recipe with counts to verify ownership and check dependencies
    const recipe = await db.recipe.findUnique({
      where: { id },
      include: {
        _count: {
          select: {
            productionSheetRecipes: true,
          },
        },
      },
    });

    if (!recipe) {
      return { success: false, error: 'Recipe not found' };
    }

    // Verify user belongs to the same bakery
    if (currentUser.bakeryId !== recipe.bakeryId) {
      return {
        success: false,
        error: 'Unauthorized: You can only delete recipes for your bakery',
      };
    }

    // Check if recipe is used in production sheets
    if (recipe._count.productionSheetRecipes > 0) {
      return {
        success: false,
        error: `Cannot delete recipe with ${recipe._count.productionSheetRecipes} production sheet(s). Please remove from production sheets first.`,
      };
    }

    // Delete recipe (cascade will delete sections and ingredients)
    await db.recipe.delete({
      where: { id },
    });

    // Log activity
    await createActivityLog({
      userId: currentUser.id!,
      action: 'DELETE',
      entityType: 'recipe',
      entityId: recipe.id,
      entityName: recipe.name,
      description: `Deleted recipe "${recipe.name}"`,
      metadata: {
        recipeId: recipe.id,
      },
      bakeryId: recipe.bakeryId,
    });

    revalidatePath('/dashboard/recipes');
    return { success: true };
  } catch (error) {
    console.error('Failed to delete recipe:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to delete recipe',
    };
  }
}

/**
 * Get all recipes for a bakery
 */
export async function getRecipesByBakery(bakeryId: string) {
  try {
    const currentUser = await getCurrentUser();

    if (!currentUser) {
      return { success: false, error: 'Unauthorized: You must be logged in' };
    }

    // Verify user belongs to the bakery
    if (currentUser.bakeryId !== bakeryId) {
      return {
        success: false,
        error: 'Unauthorized: You can only view recipes for your bakery',
      };
    }

    const recipes = await db.recipe.findMany({
      where: { bakeryId },
      include: {
        _count: {
          select: {
            sections: true,
            productionSheetRecipes: true,
          },
        },
      },
      orderBy: {
        name: 'asc',
      },
    });

    return { success: true, data: recipes };
  } catch (error) {
    console.error('Failed to fetch recipes:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to fetch recipes',
    };
  }
}

/**
 * Get a single recipe by ID
 * Includes inventory data for calculating weighted average costs
 */
export async function getRecipeById(id: string) {
  try {
    const currentUser = await getCurrentUser();

    if (!currentUser) {
      return { success: false, error: 'Unauthorized: You must be logged in' };
    }

    const recipe = await db.recipe.findUnique({
      where: { id },
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
                        },
                      },
                    },
                  },
                },
              },
            },
          },
          orderBy: {
            order: 'asc',
          },
        },
        _count: {
          select: {
            sections: true,
            productionSheetRecipes: true,
          },
        },
      },
    });

    if (!recipe) {
      return { success: false, error: 'Recipe not found' };
    }

    // Verify user belongs to the same bakery
    if (currentUser.bakeryId !== recipe.bakeryId) {
      return {
        success: false,
        error: 'Unauthorized: You can only view recipes for your bakery',
      };
    }

    // Transform the data to include calculated costPerUnit from inventory
    const transformedRecipe = {
      ...recipe,
      sections: recipe.sections.map((section) => ({
        ...section,
        ingredients: section.ingredients.map((ing) => {
          // Calculate weighted average cost from inventory
          let costPerUnit = 0;
          if (ing.ingredient.inventory && ing.ingredient.inventory.lots.length > 0) {
            const inventoryForCalc: InventoryWithLots = {
              id: ing.ingredient.inventory.id,
              displayUnit: ing.ingredient.inventory.displayUnit,
              lots: ing.ingredient.inventory.lots.map((lot) => ({
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
            costPerUnit = getWeightedAverageCost(inventoryForCalc);
          }

          return {
            ...ing,
            ingredient: {
              id: ing.ingredient.id,
              name: ing.ingredient.name,
              unit: ing.ingredient.inventory?.displayUnit ?? ing.ingredient.unit,
              costPerUnit: costPerUnit,
            },
          };
        }),
      })),
    };

    return { success: true, data: transformedRecipe };
  } catch (error) {
    console.error('Failed to fetch recipe:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to fetch recipe',
    };
  }
}
