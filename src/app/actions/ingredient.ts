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
import { Decimal } from '@prisma/client/runtime/library';

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
        currentQty: new Decimal(validatedData.currentQty),
        unit: validatedData.unit,
        costPerUnit: new Decimal(validatedData.costPerUnit),
        vendorId: validatedData.vendorId || null,
      },
      include: {
        vendor: true,
      },
    });

    // Log the activity
    await createActivityLog({
      userId: currentUser.id,
      action: 'CREATE',
      entityType: 'ingredient',
      entityId: ingredient.id,
      entityName: ingredient.name,
      description: `Created ingredient "${ingredient.name}"`,
      metadata: { ingredientId: ingredient.id, unit: ingredient.unit },
      bakeryId: ingredient.bakeryId,
    });

    revalidatePath('/dashboard/ingredients');

    return {
      success: true,
      data: ingredient,
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

    const { id, ...updateData } = validatedData;

    // Convert numbers to Decimal if present
    const prismaUpdateData: Record<string, unknown> = {};
    if (updateData.name !== undefined) prismaUpdateData.name = updateData.name;
    if (updateData.currentQty !== undefined) prismaUpdateData.currentQty = new Decimal(updateData.currentQty);
    if (updateData.unit !== undefined) prismaUpdateData.unit = updateData.unit;
    if (updateData.costPerUnit !== undefined) prismaUpdateData.costPerUnit = new Decimal(updateData.costPerUnit);
    if (updateData.vendorId !== undefined) prismaUpdateData.vendorId = updateData.vendorId;

    const ingredient = await db.ingredient.update({
      where: { id },
      data: prismaUpdateData,
      include: {
        vendor: true,
      },
    });

    // Log the activity
    await createActivityLog({
      userId: currentUser.id,
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

    return {
      success: true,
      data: ingredient,
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
        _count: {
          select: {
            recipeUses: true,
            transactions: true,
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

    await db.ingredient.delete({
      where: { id },
    });

    // Log the activity
    await createActivityLog({
      userId: currentUser.id,
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
        vendor: {
          select: {
            id: true,
            name: true,
          },
        },
        _count: {
          select: {
            transactions: true,
          },
        },
      },
      orderBy: {
        name: 'asc',
      },
    });

    return {
      success: true,
      data: ingredients,
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
        vendor: true,
        transactions: {
          orderBy: {
            createdAt: 'desc',
          },
          take: 10,
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

    return {
      success: true,
      data: ingredient,
    };
  } catch (error) {
    console.error('Error fetching ingredient:', error);
    return {
      success: false,
      error: 'Failed to fetch ingredient',
    };
  }
}
