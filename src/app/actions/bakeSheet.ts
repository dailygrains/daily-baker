'use server';

import { db } from '@/lib/db';
import { getCurrentUser } from '@/lib/clerk';
import { revalidatePath } from 'next/cache';
import { Decimal } from '@prisma/client/runtime/library';
import {
  createBakeSheetSchema,
  updateBakeSheetSchema,
  completeBakeSheetSchema,
  type CreateBakeSheetInput,
  type UpdateBakeSheetInput,
  type CompleteBakeSheetInput,
} from '@/lib/validations/bakeSheet';
import { createActivityLog } from './activity';

/**
 * Create a new bake sheet
 */
export async function createBakeSheet(data: CreateBakeSheetInput) {
  try {
    const currentUser = await getCurrentUser();

    // Validate input
    const validatedData = createBakeSheetSchema.parse(data);

    // Verify user belongs to the bakery
    if (currentUser.bakeryId !== validatedData.bakeryId) {
      return {
        success: false,
        error: 'Unauthorized: You can only create bake sheets for your bakery',
      };
    }

    // Verify recipe exists and belongs to bakery
    const recipe = await db.recipe.findUnique({
      where: { id: validatedData.recipeId },
      select: {
        id: true,
        name: true,
        bakeryId: true,
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

    // Create bake sheet
    const bakeSheet = await db.bakeSheet.create({
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
      entityType: 'bake_sheet',
      entityId: bakeSheet.id,
      entityName: `${validatedData.quantity} of ${recipe.name}`,
      description: `Created bake sheet: ${validatedData.quantity} of "${recipe.name}" (scale: ${validatedData.scale}x)`,
      metadata: {
        recipeId: recipe.id,
        recipeName: recipe.name,
        scale: validatedData.scale,
        quantity: validatedData.quantity,
      },
      bakeryId: validatedData.bakeryId,
    });

    revalidatePath('/dashboard/bake-sheets');

    return {
      success: true,
      data: bakeSheet,
    };
  } catch (error) {
    console.error('Failed to create bake sheet:', error);
    return {
      success: false,
      error:
        error instanceof Error ? error.message : 'Failed to create bake sheet',
    };
  }
}

/**
 * Get all bake sheets for a bakery
 */
export async function getBakeSheetsByBakery(bakeryId: string) {
  try {
    const currentUser = await getCurrentUser();

    // Verify user belongs to the bakery
    if (currentUser.bakeryId !== bakeryId) {
      return {
        success: false,
        error: 'Unauthorized: You can only view your bakery bake sheets',
      };
    }

    const bakeSheets = await db.bakeSheet.findMany({
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

    return { success: true, data: bakeSheets };
  } catch (error) {
    console.error('Failed to fetch bake sheets:', error);
    return {
      success: false,
      error:
        error instanceof Error ? error.message : 'Failed to fetch bake sheets',
    };
  }
}

/**
 * Get a single bake sheet by ID
 */
export async function getBakeSheetById(id: string) {
  try {
    const currentUser = await getCurrentUser();

    const bakeSheet = await db.bakeSheet.findUnique({
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
                        currentQty: true,
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
          },
        },
        completer: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
        transactions: {
          include: {
            ingredient: {
              select: {
                id: true,
                name: true,
                unit: true,
              },
            },
          },
          orderBy: {
            createdAt: 'asc',
          },
        },
      },
    });

    if (!bakeSheet) {
      return { success: false, error: 'Bake sheet not found' };
    }

    // Verify user belongs to the bakery
    if (currentUser.bakeryId !== bakeSheet.bakeryId) {
      return {
        success: false,
        error: 'Unauthorized: Bake sheet does not belong to your bakery',
      };
    }

    return { success: true, data: bakeSheet };
  } catch (error) {
    console.error('Failed to fetch bake sheet:', error);
    return {
      success: false,
      error:
        error instanceof Error ? error.message : 'Failed to fetch bake sheet',
    };
  }
}

/**
 * Update a bake sheet
 */
export async function updateBakeSheet(data: UpdateBakeSheetInput) {
  try {
    const currentUser = await getCurrentUser();

    // Validate input
    const validatedData = updateBakeSheetSchema.parse(data);

    // Get existing bake sheet
    const existingBakeSheet = await db.bakeSheet.findUnique({
      where: { id: validatedData.id },
      select: {
        bakeryId: true,
        completed: true,
      },
    });

    if (!existingBakeSheet) {
      return { success: false, error: 'Bake sheet not found' };
    }

    // Verify user belongs to the bakery
    if (currentUser.bakeryId !== existingBakeSheet.bakeryId) {
      return {
        success: false,
        error: 'Unauthorized: Bake sheet does not belong to your bakery',
      };
    }

    // Cannot update completed bake sheet
    if (existingBakeSheet.completed) {
      return {
        success: false,
        error: 'Cannot update a completed bake sheet',
      };
    }

    // Prepare update data
    const updateData: any = {};
    if (validatedData.scale !== undefined) {
      updateData.scale = new Decimal(validatedData.scale);
    }
    if (validatedData.quantity !== undefined) {
      updateData.quantity = validatedData.quantity;
    }
    if (validatedData.notes !== undefined) {
      updateData.notes = validatedData.notes;
    }

    // Update bake sheet
    const bakeSheet = await db.bakeSheet.update({
      where: { id: validatedData.id },
      data: updateData,
    });

    // Log activity
    await createActivityLog({
      userId: currentUser.id,
      action: 'UPDATE',
      entityType: 'bake_sheet',
      entityId: bakeSheet.id,
      entityName: `Bake sheet ${validatedData.id.substring(0, 8)}`,
      description: `Updated bake sheet`,
      bakeryId: existingBakeSheet.bakeryId,
    });

    revalidatePath('/dashboard/bake-sheets');
    revalidatePath(`/dashboard/bake-sheets/${validatedData.id}`);

    return {
      success: true,
      data: bakeSheet,
    };
  } catch (error) {
    console.error('Failed to update bake sheet:', error);
    return {
      success: false,
      error:
        error instanceof Error ? error.message : 'Failed to update bake sheet',
    };
  }
}

/**
 * Complete a bake sheet and create inventory transactions
 */
export async function completeBakeSheet(data: CompleteBakeSheetInput) {
  try {
    const currentUser = await getCurrentUser();

    // Validate input
    const validatedData = completeBakeSheetSchema.parse(data);

    // Get bake sheet with recipe and ingredients
    const bakeSheet = await db.bakeSheet.findUnique({
      where: { id: validatedData.id },
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
                        currentQty: true,
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

    if (!bakeSheet) {
      return { success: false, error: 'Bake sheet not found' };
    }

    // Verify user belongs to the bakery
    if (currentUser.bakeryId !== bakeSheet.bakeryId) {
      return {
        success: false,
        error: 'Unauthorized: Bake sheet does not belong to your bakery',
      };
    }

    // Check if already completed
    if (bakeSheet.completed) {
      return {
        success: false,
        error: 'Bake sheet is already completed',
      };
    }

    // Calculate scaled ingredient quantities and verify inventory
    const scale = Number(bakeSheet.scale);
    const ingredientUsage: Array<{
      ingredientId: string;
      ingredientName: string;
      quantity: number;
      unit: string;
      currentQty: number;
    }> = [];

    for (const section of bakeSheet.recipe.sections) {
      for (const recipeIngredient of section.ingredients) {
        const scaledQuantity = Number(recipeIngredient.quantity) * scale;
        const currentQty = Number(recipeIngredient.ingredient.currentQty);

        // Check if there's enough inventory
        if (currentQty < scaledQuantity) {
          return {
            success: false,
            error: `Insufficient inventory for ${recipeIngredient.ingredient.name}: need ${scaledQuantity} ${recipeIngredient.unit}, have ${currentQty} ${recipeIngredient.ingredient.unit}`,
          };
        }

        ingredientUsage.push({
          ingredientId: recipeIngredient.ingredient.id,
          ingredientName: recipeIngredient.ingredient.name,
          quantity: scaledQuantity,
          unit: recipeIngredient.unit,
          currentQty,
        });
      }
    }

    // Complete the bake sheet and create transactions in a database transaction
    const result = await db.$transaction(async (tx) => {
      // Mark bake sheet as completed
      const completedBakeSheet = await tx.bakeSheet.update({
        where: { id: validatedData.id },
        data: {
          completed: true,
          completedAt: new Date(),
          completedBy: currentUser.id,
        },
      });

      // Create USE transactions for each ingredient
      const transactions = [];
      for (const usage of ingredientUsage) {
        const transaction = await tx.inventoryTransaction.create({
          data: {
            type: 'USE',
            ingredientId: usage.ingredientId,
            quantity: new Decimal(usage.quantity),
            unit: usage.unit,
            notes: `Used for bake sheet: ${bakeSheet.quantity} of ${bakeSheet.recipe.name}`,
            bakeryId: bakeSheet.bakeryId,
            userId: currentUser.id,
          },
        });

        transactions.push(transaction);

        // Update ingredient quantity
        await tx.ingredient.update({
          where: { id: usage.ingredientId },
          data: {
            currentQty: new Decimal(usage.currentQty - usage.quantity),
          },
        });
      }

      return { completedBakeSheet, transactions };
    });

    // Log activity
    await createActivityLog({
      userId: currentUser.id,
      action: 'UPDATE',
      entityType: 'bake_sheet',
      entityId: bakeSheet.id,
      entityName: `${bakeSheet.quantity} of ${bakeSheet.recipe.name}`,
      description: `Completed bake sheet: ${bakeSheet.quantity} of "${bakeSheet.recipe.name}" and created ${ingredientUsage.length} inventory transactions`,
      metadata: {
        recipeId: bakeSheet.recipe.id,
        recipeName: bakeSheet.recipe.name,
        scale: scale,
        quantity: bakeSheet.quantity,
        transactionCount: ingredientUsage.length,
        ingredientsUsed: ingredientUsage.map((u) => ({
          name: u.ingredientName,
          quantity: u.quantity,
          unit: u.unit,
        })),
      },
      bakeryId: bakeSheet.bakeryId,
    });

    revalidatePath('/dashboard/bake-sheets');
    revalidatePath(`/dashboard/bake-sheets/${validatedData.id}`);
    revalidatePath('/dashboard/inventory');

    return {
      success: true,
      data: result.completedBakeSheet,
      transactionsCreated: result.transactions.length,
    };
  } catch (error) {
    console.error('Failed to complete bake sheet:', error);
    return {
      success: false,
      error:
        error instanceof Error ? error.message : 'Failed to complete bake sheet',
    };
  }
}

/**
 * Delete a bake sheet
 */
export async function deleteBakeSheet(id: string) {
  try {
    const currentUser = await getCurrentUser();

    // Get bake sheet
    const bakeSheet = await db.bakeSheet.findUnique({
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

    if (!bakeSheet) {
      return { success: false, error: 'Bake sheet not found' };
    }

    // Verify user belongs to the bakery
    if (currentUser.bakeryId !== bakeSheet.bakeryId) {
      return {
        success: false,
        error: 'Unauthorized: Bake sheet does not belong to your bakery',
      };
    }

    // Cannot delete completed bake sheet
    if (bakeSheet.completed) {
      return {
        success: false,
        error: 'Cannot delete a completed bake sheet',
      };
    }

    // Delete bake sheet
    await db.bakeSheet.delete({
      where: { id },
    });

    // Log activity
    await createActivityLog({
      userId: currentUser.id,
      action: 'DELETE',
      entityType: 'bake_sheet',
      entityId: id,
      entityName: `${bakeSheet.quantity} of ${bakeSheet.recipe.name}`,
      description: `Deleted bake sheet: ${bakeSheet.quantity} of "${bakeSheet.recipe.name}"`,
      bakeryId: bakeSheet.bakeryId,
    });

    revalidatePath('/dashboard/bake-sheets');

    return { success: true };
  } catch (error) {
    console.error('Failed to delete bake sheet:', error);
    return {
      success: false,
      error:
        error instanceof Error ? error.message : 'Failed to delete bake sheet',
    };
  }
}
