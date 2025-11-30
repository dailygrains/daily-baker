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
        description: validatedData.description,
        category: validatedData.category,
        defaultUnit: validatedData.defaultUnit,
        reorderLevel: validatedData.reorderLevel !== undefined ? new Decimal(validatedData.reorderLevel) : undefined,
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
      userId: currentUser.id,
      action: 'CREATE',
      entityType: 'ingredient',
      entityId: ingredient.id,
      entityName: ingredient.name,
      description: `Created ingredient "${ingredient.name}"`,
      metadata: { ingredientId: ingredient.id, defaultUnit: ingredient.defaultUnit },
      bakeryId: ingredient.bakeryId,
    });

    revalidatePath('/dashboard/ingredients');

    // Serialize Decimal fields for client components
    return {
      success: true,
      data: {
        ...ingredient,
        reorderLevel: ingredient.reorderLevel?.toNumber() ?? null,
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
    if (updateData.description !== undefined) prismaUpdateData.description = updateData.description;
    if (updateData.category !== undefined) prismaUpdateData.category = updateData.category;
    if (updateData.defaultUnit !== undefined) prismaUpdateData.defaultUnit = updateData.defaultUnit;
    if (updateData.reorderLevel !== undefined) prismaUpdateData.reorderLevel = new Decimal(updateData.reorderLevel);

    const ingredient = await db.ingredient.update({
      where: { id },
      data: prismaUpdateData,
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

    // Serialize Decimal fields for client components
    return {
      success: true,
      data: {
        ...ingredient,
        reorderLevel: ingredient.reorderLevel?.toNumber() ?? null,
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
        _count: {
          select: {
            recipeUses: true,
            inventoryItems: true,
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
        _count: {
          select: {
            inventoryItems: true,
          },
        },
      },
      orderBy: {
        name: 'asc',
      },
    });

    // Serialize Decimal fields for client components
    return {
      success: true,
      data: ingredients.map(ingredient => ({
        ...ingredient,
        reorderLevel: ingredient.reorderLevel?.toNumber() ?? null,
      })),
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
        inventoryItems: {
          include: {
            vendor: true,
          },
          orderBy: {
            createdAt: 'desc',
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

    // Serialize Decimal fields for client components
    return {
      success: true,
      data: {
        ...ingredient,
        reorderLevel: ingredient.reorderLevel?.toNumber() ?? null,
        inventoryItems: ingredient.inventoryItems.map(item => ({
          ...item,
          quantity: item.quantity.toNumber(),
          purchasePrice: item.purchasePrice?.toNumber() ?? null,
        })),
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
      userId: currentUser.id,
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
        userId: currentUser.id,
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
