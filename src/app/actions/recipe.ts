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
import { revalidatePath } from 'next/cache';
import { Decimal } from '@prisma/client/runtime/library';

/**
 * Calculate total cost of a recipe based on ingredients
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
      // Fetch ingredient cost
      const ingredient = await db.ingredient.findUnique({
        where: { id: ing.ingredientId },
        select: { costPerUnit: true, unit: true },
      });

      if (ingredient) {
        // Simple cost calculation (assumes units match)
        // TODO: Add unit conversion in future
        const cost = Number(ingredient.costPerUnit) * ing.quantity;
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
        yield: validatedData.yield,
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
      userId: currentUser.id,
      action: 'CREATE',
      entityType: 'recipe',
      entityId: recipe.id,
      entityName: recipe.name,
      description: `Created recipe "${recipe.name}"`,
      metadata: {
        recipeId: recipe.id,
        yield: recipe.yield,
        sectionCount: recipe.sections.length,
      },
      bakeryId: recipe.bakeryId,
    });

    revalidatePath('/dashboard/recipes');
    return { success: true, data: recipe };
  } catch (error) {
    console.error('Failed to create recipe:', error);
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
        yield: validatedData.yield,
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
      userId: currentUser.id,
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
    return { success: true, data: recipe };
  } catch (error) {
    console.error('Failed to update recipe:', error);
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
            bakeSheets: true,
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

    // Check if recipe is used in bake sheets
    if (recipe._count.bakeSheets > 0) {
      return {
        success: false,
        error: `Cannot delete recipe with ${recipe._count.bakeSheets} bake sheet(s). Please remove from bake sheets first.`,
      };
    }

    // Delete recipe (cascade will delete sections and ingredients)
    await db.recipe.delete({
      where: { id },
    });

    // Log activity
    await createActivityLog({
      userId: currentUser.id,
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
            bakeSheets: true,
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
                  select: {
                    id: true,
                    name: true,
                    unit: true,
                    costPerUnit: true,
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
            bakeSheets: true,
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

    return { success: true, data: recipe };
  } catch (error) {
    console.error('Failed to fetch recipe:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to fetch recipe',
    };
  }
}
