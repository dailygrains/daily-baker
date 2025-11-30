'use server';

import { db } from '@/lib/db';
import { getCurrentUser } from '@/lib/clerk';
import { revalidatePath } from 'next/cache';
import { createActivityLog } from './activity-log';
import {
  createInventoryItemSchema,
  updateInventoryItemSchema,
  type CreateInventoryItemInput,
  type UpdateInventoryItemInput,
} from '@/lib/validations/inventoryItem';
import { Decimal } from '@prisma/client/runtime/library';

export async function createInventoryItem(data: CreateInventoryItemInput) {
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
        error: 'Unauthorized: You can only create inventory items for your bakery',
      };
    }

    // Validate input
    const validatedData = createInventoryItemSchema.parse(data);

    // Verify ingredient exists and belongs to the bakery
    const ingredient = await db.ingredient.findUnique({
      where: { id: validatedData.ingredientId },
      select: { id: true, name: true, bakeryId: true },
    });

    if (!ingredient) {
      return {
        success: false,
        error: 'Ingredient not found',
      };
    }

    if (ingredient.bakeryId !== validatedData.bakeryId) {
      return {
        success: false,
        error: 'Ingredient does not belong to your bakery',
      };
    }

    // If vendorId provided, verify it belongs to the bakery
    if (validatedData.vendorId) {
      const vendor = await db.vendor.findUnique({
        where: { id: validatedData.vendorId },
        select: { bakeryId: true },
      });

      if (!vendor || vendor.bakeryId !== validatedData.bakeryId) {
        return {
          success: false,
          error: 'Vendor not found or does not belong to your bakery',
        };
      }
    }

    const inventoryItem = await db.inventoryItem.create({
      data: {
        bakeryId: validatedData.bakeryId,
        ingredientId: validatedData.ingredientId,
        quantity: new Decimal(validatedData.quantity),
        unit: validatedData.unit,
        vendorId: validatedData.vendorId,
        purchasePrice: validatedData.purchasePrice !== undefined ? new Decimal(validatedData.purchasePrice) : undefined,
        purchaseDate: validatedData.purchaseDate,
        batchNumber: validatedData.batchNumber,
        expirationDate: validatedData.expirationDate,
        location: validatedData.location,
        notes: validatedData.notes,
      },
      include: {
        ingredient: {
          select: {
            id: true,
            name: true,
          },
        },
        vendor: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    });

    // Log the activity
    await createActivityLog({
      userId: currentUser.id,
      action: 'CREATE',
      entityType: 'inventory_item',
      entityId: inventoryItem.id,
      entityName: `${ingredient.name} - ${validatedData.quantity} ${validatedData.unit}`,
      description: `Added inventory item for "${ingredient.name}" (${validatedData.quantity} ${validatedData.unit})`,
      metadata: {
        inventoryItemId: inventoryItem.id,
        ingredientId: ingredient.id,
        quantity: validatedData.quantity,
        unit: validatedData.unit,
      },
      bakeryId: validatedData.bakeryId,
    });

    revalidatePath('/dashboard/inventory');
    revalidatePath(`/dashboard/ingredients/${validatedData.ingredientId}`);

    // Serialize Decimal fields for client components
    return {
      success: true,
      data: {
        ...inventoryItem,
        quantity: inventoryItem.quantity.toNumber(),
        purchasePrice: inventoryItem.purchasePrice?.toNumber() ?? null,
      },
    };
  } catch (error) {
    console.error('Error creating inventory item:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to create inventory item',
    };
  }
}

export async function updateInventoryItem(data: UpdateInventoryItemInput) {
  try {
    const currentUser = await getCurrentUser();

    if (!currentUser) {
      return {
        success: false,
        error: 'Unauthorized: You must be logged in',
      };
    }

    // Validate input
    const validatedData = updateInventoryItemSchema.parse(data);

    // Check if inventory item exists and user has access
    const existingItem = await db.inventoryItem.findUnique({
      where: { id: validatedData.id },
      include: {
        ingredient: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    });

    if (!existingItem) {
      return {
        success: false,
        error: 'Inventory item not found',
      };
    }

    if (currentUser.bakeryId !== existingItem.bakeryId) {
      return {
        success: false,
        error: 'Unauthorized: You can only update inventory items for your bakery',
      };
    }

    // If vendorId provided, verify it belongs to the bakery
    if (validatedData.vendorId) {
      const vendor = await db.vendor.findUnique({
        where: { id: validatedData.vendorId },
        select: { bakeryId: true },
      });

      if (!vendor || vendor.bakeryId !== existingItem.bakeryId) {
        return {
          success: false,
          error: 'Vendor not found or does not belong to your bakery',
        };
      }
    }

    const { id, ...updateData } = validatedData;

    // Convert numbers to Decimal if present
    const prismaUpdateData: Record<string, unknown> = {};
    if (updateData.quantity !== undefined) prismaUpdateData.quantity = new Decimal(updateData.quantity);
    if (updateData.unit !== undefined) prismaUpdateData.unit = updateData.unit;
    if (updateData.vendorId !== undefined) prismaUpdateData.vendorId = updateData.vendorId;
    if (updateData.purchasePrice !== undefined) prismaUpdateData.purchasePrice = new Decimal(updateData.purchasePrice);
    if (updateData.purchaseDate !== undefined) prismaUpdateData.purchaseDate = updateData.purchaseDate;
    if (updateData.batchNumber !== undefined) prismaUpdateData.batchNumber = updateData.batchNumber;
    if (updateData.expirationDate !== undefined) prismaUpdateData.expirationDate = updateData.expirationDate;
    if (updateData.location !== undefined) prismaUpdateData.location = updateData.location;
    if (updateData.notes !== undefined) prismaUpdateData.notes = updateData.notes;

    const inventoryItem = await db.inventoryItem.update({
      where: { id },
      data: prismaUpdateData,
      include: {
        ingredient: {
          select: {
            id: true,
            name: true,
          },
        },
        vendor: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    });

    // Log the activity
    await createActivityLog({
      userId: currentUser.id,
      action: 'UPDATE',
      entityType: 'inventory_item',
      entityId: inventoryItem.id,
      entityName: `${existingItem.ingredient.name} inventory`,
      description: `Updated inventory item for "${existingItem.ingredient.name}"`,
      metadata: { inventoryItemId: inventoryItem.id, updatedFields: Object.keys(updateData) },
      bakeryId: inventoryItem.bakeryId,
    });

    revalidatePath('/dashboard/inventory');
    revalidatePath(`/dashboard/ingredients/${inventoryItem.ingredientId}`);

    // Serialize Decimal fields for client components
    return {
      success: true,
      data: {
        ...inventoryItem,
        quantity: inventoryItem.quantity.toNumber(),
        purchasePrice: inventoryItem.purchasePrice?.toNumber() ?? null,
      },
    };
  } catch (error) {
    console.error('Error updating inventory item:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to update inventory item',
    };
  }
}

export async function deleteInventoryItem(id: string) {
  try {
    const currentUser = await getCurrentUser();

    if (!currentUser) {
      return {
        success: false,
        error: 'Unauthorized: You must be logged in',
      };
    }

    // Check if inventory item exists and user has access
    const inventoryItem = await db.inventoryItem.findUnique({
      where: { id },
      include: {
        ingredient: {
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
    });

    if (!inventoryItem) {
      return {
        success: false,
        error: 'Inventory item not found',
      };
    }

    if (currentUser.bakeryId !== inventoryItem.bakeryId) {
      return {
        success: false,
        error: 'Unauthorized: You can only delete inventory items for your bakery',
      };
    }

    // Check if inventory item has transactions
    if (inventoryItem._count.transactions > 0) {
      return {
        success: false,
        error: `Cannot delete inventory item with ${inventoryItem._count.transactions} transaction(s). Please delete transactions first.`,
      };
    }

    await db.inventoryItem.delete({
      where: { id },
    });

    // Log the activity
    await createActivityLog({
      userId: currentUser.id,
      action: 'DELETE',
      entityType: 'inventory_item',
      entityId: inventoryItem.id,
      entityName: `${inventoryItem.ingredient.name} inventory`,
      description: `Deleted inventory item for "${inventoryItem.ingredient.name}"`,
      metadata: { inventoryItemId: inventoryItem.id },
      bakeryId: inventoryItem.bakeryId,
    });

    revalidatePath('/dashboard/inventory');
    revalidatePath(`/dashboard/ingredients/${inventoryItem.ingredientId}`);

    return {
      success: true,
    };
  } catch (error) {
    console.error('Error deleting inventory item:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to delete inventory item',
    };
  }
}

export async function getInventoryItemsByBakery(bakeryId: string) {
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
        error: 'Unauthorized: You can only view inventory items for your bakery',
      };
    }

    const inventoryItems = await db.inventoryItem.findMany({
      where: { bakeryId },
      include: {
        ingredient: {
          select: {
            id: true,
            name: true,
            category: true,
            defaultUnit: true,
          },
        },
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
      orderBy: [
        { ingredient: { name: 'asc' } },
        { createdAt: 'desc' },
      ],
    });

    // Serialize Decimal fields for client components
    return {
      success: true,
      data: inventoryItems.map(item => ({
        ...item,
        quantity: item.quantity.toNumber(),
        purchasePrice: item.purchasePrice?.toNumber() ?? null,
      })),
    };
  } catch (error) {
    console.error('Error fetching inventory items:', error);
    return {
      success: false,
      error: 'Failed to fetch inventory items',
    };
  }
}

export async function getInventoryItemById(id: string) {
  try {
    const currentUser = await getCurrentUser();

    if (!currentUser) {
      return {
        success: false,
        error: 'Unauthorized',
      };
    }

    const inventoryItem = await db.inventoryItem.findUnique({
      where: { id },
      include: {
        ingredient: {
          select: {
            id: true,
            name: true,
            category: true,
            defaultUnit: true,
          },
        },
        vendor: true,
        transactions: {
          include: {
            creator: {
              select: {
                id: true,
                name: true,
              },
            },
          },
          orderBy: {
            createdAt: 'desc',
          },
          take: 10,
        },
      },
    });

    if (!inventoryItem) {
      return {
        success: false,
        error: 'Inventory item not found',
      };
    }

    if (currentUser.bakeryId !== inventoryItem.bakeryId && !currentUser.isPlatformAdmin) {
      return {
        success: false,
        error: 'Unauthorized: You can only view inventory items for your bakery',
      };
    }

    // Serialize Decimal fields for client components
    return {
      success: true,
      data: {
        ...inventoryItem,
        quantity: inventoryItem.quantity.toNumber(),
        purchasePrice: inventoryItem.purchasePrice?.toNumber() ?? null,
        transactions: inventoryItem.transactions.map(t => ({
          ...t,
          quantity: t.quantity.toNumber(),
          unitCost: t.unitCost?.toNumber() ?? null,
          totalCost: t.totalCost?.toNumber() ?? null,
        })),
      },
    };
  } catch (error) {
    console.error('Error fetching inventory item:', error);
    return {
      success: false,
      error: 'Failed to fetch inventory item',
    };
  }
}
