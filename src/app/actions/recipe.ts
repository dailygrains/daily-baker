'use server';

import { db } from '@/lib/db';
import { getCurrentUser } from '@/lib/clerk';
import type { CreateRecipeInput, UpdateRecipeInput } from '@/lib/validations/recipe';
import { revalidatePath } from 'next/cache';
import { getWeightedAverageCost, type InventoryWithLots } from '@/lib/inventory';
import { actionContext, actionError, UNAUTHORIZED, type ActionResult } from '@/lib/services/action';
import * as recipeService from '@/lib/services/recipe';

/**
 * Create a new recipe
 */
export async function createRecipe(data: CreateRecipeInput): Promise<ActionResult> {
  try {
    const ctx = await actionContext();
    if (!ctx) return UNAUTHORIZED;
    if (ctx.bakeryId !== data.bakeryId) {
      return { success: false, error: 'Unauthorized: You can only create recipes for your bakery' };
    }

    await recipeService.createRecipe(ctx, data);

    revalidatePath('/dashboard/recipes');
    return { success: true };
  } catch (error) {
    return actionError(error, 'Failed to create recipe. Please try again.');
  }
}

/**
 * Update an existing recipe
 */
export async function updateRecipe(data: UpdateRecipeInput): Promise<ActionResult> {
  try {
    const ctx = await actionContext();
    if (!ctx) return UNAUTHORIZED;

    const recipe = await recipeService.updateRecipe(ctx, data.id, data);

    revalidatePath('/dashboard/recipes');
    revalidatePath(`/dashboard/recipes/${recipe.id}`);
    return { success: true };
  } catch (error) {
    return actionError(error, 'Failed to update recipe. Please try again.');
  }
}

/**
 * Delete a recipe
 */
export async function deleteRecipe(id: string): Promise<ActionResult> {
  try {
    const ctx = await actionContext();
    if (!ctx) return UNAUTHORIZED;

    await recipeService.deleteRecipe(ctx, id);

    revalidatePath('/dashboard/recipes');
    return { success: true };
  } catch (error) {
    return actionError(error, 'Failed to delete recipe');
  }
}

/**
 * Get all recipes for a bakery
 */
export async function getRecipesByBakery(bakeryId: string, search?: string) {
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
      where: {
        bakeryId,
        ...(search && {
          name: { contains: search, mode: 'insensitive' },
        }),
      },
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
              orderBy: { order: 'asc' },
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
            const density = ing.ingredient.densityGramsPerMl
              ? Number(ing.ingredient.densityGramsPerMl)
              : null;
            costPerUnit = getWeightedAverageCost(inventoryForCalc, density);
          }

          return {
            ...ing,
            ingredient: {
              id: ing.ingredient.id,
              name: ing.ingredient.name,
              unit: ing.ingredient.inventory?.displayUnit ?? ing.ingredient.unit,
              costPerUnit: costPerUnit,
              densityGramsPerMl: ing.ingredient.densityGramsPerMl
                ? Number(ing.ingredient.densityGramsPerMl)
                : null,
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
