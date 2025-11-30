'use server';

import { db } from '@/lib/db';
import { getCurrentUser } from '@/lib/clerk';
import { revalidatePath } from 'next/cache';
import { Decimal } from '@prisma/client/runtime/library';
import {
  createInventoryTransactionSchema,
  type CreateInventoryTransactionInput,
} from '@/lib/validations/inventoryTransaction';
import { createActivityLog } from './activity';
import { convertUnits } from '@/lib/unitConversion';

/**
 * Create an inventory transaction and update inventory item quantity
 */
export async function createInventoryTransaction(
  data: CreateInventoryTransactionInput
) {
  try {
    const currentUser = await getCurrentUser();

    if (!currentUser) {
      return { success: false, error: 'Unauthorized: You must be logged in' };
    }

    // Validate input
    const validatedData = createInventoryTransactionSchema.parse(data);

    // Verify user belongs to the bakery
    if (currentUser.bakeryId !== validatedData.bakeryId) {
      return {
        success: false,
        error:
          'Unauthorized: You can only create transactions for your bakery',
      };
    }

    // Get the inventory item to validate and calculate new quantity
    const inventoryItem = await db.inventoryItem.findUnique({
      where: { id: validatedData.inventoryItemId },
      include: {
        ingredient: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    });

    if (!inventoryItem) {
      return { success: false, error: 'Inventory item not found' };
    }

    // Verify inventory item belongs to the bakery
    if (inventoryItem.bakeryId !== validatedData.bakeryId) {
      return {
        success: false,
        error: 'Unauthorized: Inventory item does not belong to your bakery',
      };
    }

    // Convert quantity to inventory item's unit if necessary
    let adjustedQuantity = validatedData.quantity;
    if (validatedData.unit !== inventoryItem.unit) {
      const converted = await convertUnits(
        validatedData.quantity,
        validatedData.unit,
        inventoryItem.unit
      );

      if (converted === null) {
        return {
          success: false,
          error: `Cannot convert from ${validatedData.unit} to ${inventoryItem.unit}. Please add this conversion or use ${inventoryItem.unit}.`,
        };
      }

      adjustedQuantity = converted;
    }

    // Calculate quantity delta based on transaction type
    let quantityDelta = new Decimal(adjustedQuantity);

    switch (validatedData.type) {
      case 'RECEIVE':
        // Add to inventory
        quantityDelta = quantityDelta.abs();
        break;
      case 'USE':
      case 'WASTE':
        // Subtract from inventory
        quantityDelta = quantityDelta.abs().negated();
        break;
      case 'ADJUST':
        // Keep as-is (can be positive or negative)
        break;
    }

    // Calculate new quantity
    const newQuantity = new Decimal(inventoryItem.quantity).plus(quantityDelta);

    // Validate new quantity is not negative
    if (newQuantity.isNegative()) {
      return {
        success: false,
        error: `Insufficient inventory: ${inventoryItem.ingredient.name} current quantity is ${inventoryItem.quantity} ${inventoryItem.unit}`,
      };
    }

    // Create transaction and update inventory item in a transaction
    const transaction = await db.$transaction(async (tx) => {
      // Create the inventory transaction
      const newTransaction = await tx.inventoryTransaction.create({
        data: {
          type: validatedData.type,
          inventoryItemId: validatedData.inventoryItemId,
          quantity: new Decimal(validatedData.quantity),
          unit: validatedData.unit,
          unitCost: validatedData.unitCost !== undefined ? new Decimal(validatedData.unitCost) : undefined,
          totalCost: validatedData.totalCost !== undefined ? new Decimal(validatedData.totalCost) : undefined,
          notes: validatedData.notes || null,
          bakeSheetId: validatedData.bakeSheetId,
          createdBy: currentUser.id,
        },
      });

      // Update inventory item quantity
      await tx.inventoryItem.update({
        where: { id: validatedData.inventoryItemId },
        data: {
          quantity: newQuantity,
        },
      });

      return newTransaction;
    });

    // Log activity
    await createActivityLog({
      userId: currentUser.id,
      action: 'CREATE',
      entityType: 'inventory_transaction',
      entityId: transaction.id,
      entityName: `${validatedData.type} ${validatedData.quantity} ${validatedData.unit} of ${inventoryItem.ingredient.name}`,
      description: `Recorded ${validatedData.type.toLowerCase()} transaction for "${inventoryItem.ingredient.name}" (${validatedData.quantity} ${validatedData.unit})`,
      metadata: {
        transactionType: validatedData.type,
        inventoryItemId: inventoryItem.id,
        ingredientId: inventoryItem.ingredient.id,
        ingredientName: inventoryItem.ingredient.name,
        quantity: validatedData.quantity,
        unit: validatedData.unit,
        previousQuantity: Number(inventoryItem.quantity),
        newQuantity: Number(newQuantity),
      },
      bakeryId: validatedData.bakeryId,
    });

    revalidatePath('/dashboard/inventory');
    revalidatePath(`/dashboard/ingredients/${inventoryItem.ingredientId}`);

    // Serialize Decimal fields for client components
    return {
      success: true,
      data: {
        ...transaction,
        quantity: transaction.quantity.toNumber(),
        unitCost: transaction.unitCost?.toNumber() ?? null,
        totalCost: transaction.totalCost?.toNumber() ?? null,
      },
    };
  } catch (error) {
    console.error('Failed to create inventory transaction:', error);
    return {
      success: false,
      error:
        error instanceof Error ? error.message : 'Failed to create transaction',
    };
  }
}

/**
 * Get all inventory transactions for a bakery with optional filtering
 */
export async function getInventoryTransactionsByBakery(
  bakeryId: string,
  filters?: {
    type?: string;
    inventoryItemId?: string;
    ingredientId?: string;
    startDate?: Date;
    endDate?: Date;
    limit?: number;
  }
) {
  try {
    const currentUser = await getCurrentUser();

    if (!currentUser) {
      return { success: false, error: 'Unauthorized: You must be logged in' };
    }

    // Verify user belongs to the bakery
    if (currentUser.bakeryId !== bakeryId && !currentUser.isPlatformAdmin) {
      return {
        success: false,
        error: 'Unauthorized: You can only view your bakery transactions',
      };
    }

    const where: {
      inventoryItem: {
        bakeryId: string;
        ingredientId?: string;
      };
      type?: import('@/generated/prisma').TransactionType;
      inventoryItemId?: string;
      createdAt?: { gte?: Date; lte?: Date };
    } = {
      inventoryItem: {
        bakeryId,
      },
    };

    // Apply filters
    if (filters?.type) {
      where.type = filters.type as import('@/generated/prisma').TransactionType;
    }
    if (filters?.inventoryItemId) {
      where.inventoryItemId = filters.inventoryItemId;
    }
    if (filters?.ingredientId) {
      where.inventoryItem.ingredientId = filters.ingredientId;
    }
    if (filters?.startDate || filters?.endDate) {
      where.createdAt = {};
      if (filters.startDate) {
        where.createdAt.gte = filters.startDate;
      }
      if (filters.endDate) {
        where.createdAt.lte = filters.endDate;
      }
    }

    const transactions = await db.inventoryTransaction.findMany({
      where,
      include: {
        inventoryItem: {
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
        },
        creator: {
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
      take: filters?.limit || 100,
    });

    // Serialize Decimal fields for client components
    return {
      success: true,
      data: transactions.map(t => ({
        ...t,
        quantity: t.quantity.toNumber(),
        unitCost: t.unitCost?.toNumber() ?? null,
        totalCost: t.totalCost?.toNumber() ?? null,
        inventoryItem: {
          ...t.inventoryItem,
          quantity: t.inventoryItem.quantity.toNumber(),
          purchasePrice: t.inventoryItem.purchasePrice?.toNumber() ?? null,
        },
      })),
    };
  } catch (error) {
    console.error('Failed to fetch inventory transactions:', error);
    return {
      success: false,
      error:
        error instanceof Error
          ? error.message
          : 'Failed to fetch transactions',
    };
  }
}

/**
 * Get inventory transactions for a specific inventory item
 */
export async function getInventoryTransactionsByInventoryItem(
  inventoryItemId: string
) {
  try {
    const currentUser = await getCurrentUser();

    if (!currentUser) {
      return { success: false, error: 'Unauthorized: You must be logged in' };
    }

    // Get inventory item to verify ownership
    const inventoryItem = await db.inventoryItem.findUnique({
      where: { id: inventoryItemId },
      select: { bakeryId: true },
    });

    if (!inventoryItem) {
      return { success: false, error: 'Inventory item not found' };
    }

    // Verify user belongs to the bakery
    if (currentUser.bakeryId !== inventoryItem.bakeryId && !currentUser.isPlatformAdmin) {
      return {
        success: false,
        error: 'Unauthorized: Inventory item does not belong to your bakery',
      };
    }

    const transactions = await db.inventoryTransaction.findMany({
      where: { inventoryItemId },
      include: {
        creator: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
        bakeSheet: {
          select: {
            id: true,
            quantity: true,
            recipe: {
              select: {
                id: true,
                name: true,
              },
            },
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    // Serialize Decimal fields for client components
    return {
      success: true,
      data: transactions.map(t => ({
        ...t,
        quantity: t.quantity.toNumber(),
        unitCost: t.unitCost?.toNumber() ?? null,
        totalCost: t.totalCost?.toNumber() ?? null,
      })),
    };
  } catch (error) {
    console.error('Failed to fetch inventory item transactions:', error);
    return {
      success: false,
      error:
        error instanceof Error
          ? error.message
          : 'Failed to fetch transactions',
    };
  }
}

/**
 * Get inventory transactions for a specific ingredient (across all inventory items)
 */
export async function getInventoryTransactionsByIngredient(
  ingredientId: string
) {
  try {
    const currentUser = await getCurrentUser();

    if (!currentUser) {
      return { success: false, error: 'Unauthorized: You must be logged in' };
    }

    // Get ingredient to verify ownership
    const ingredient = await db.ingredient.findUnique({
      where: { id: ingredientId },
      select: { bakeryId: true },
    });

    if (!ingredient) {
      return { success: false, error: 'Ingredient not found' };
    }

    // Verify user belongs to the bakery
    if (currentUser.bakeryId !== ingredient.bakeryId && !currentUser.isPlatformAdmin) {
      return {
        success: false,
        error: 'Unauthorized: Ingredient does not belong to your bakery',
      };
    }

    const transactions = await db.inventoryTransaction.findMany({
      where: {
        inventoryItem: {
          ingredientId,
        },
      },
      include: {
        inventoryItem: {
          select: {
            id: true,
            batchNumber: true,
            vendor: {
              select: {
                id: true,
                name: true,
              },
            },
          },
        },
        creator: {
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

    // Serialize Decimal fields for client components
    return {
      success: true,
      data: transactions.map(t => ({
        ...t,
        quantity: t.quantity.toNumber(),
        unitCost: t.unitCost?.toNumber() ?? null,
        totalCost: t.totalCost?.toNumber() ?? null,
      })),
    };
  } catch (error) {
    console.error('Failed to fetch ingredient transactions:', error);
    return {
      success: false,
      error:
        error instanceof Error
          ? error.message
          : 'Failed to fetch transactions',
    };
  }
}

/**
 * Delete an inventory transaction and reverse the quantity change
 * Note: This should be used carefully and may require admin permissions
 */
export async function deleteInventoryTransaction(transactionId: string) {
  try {
    const currentUser = await getCurrentUser();

    if (!currentUser) {
      return { success: false, error: 'Unauthorized: You must be logged in' };
    }

    // Get the transaction
    const transaction = await db.inventoryTransaction.findUnique({
      where: { id: transactionId },
      include: {
        inventoryItem: {
          include: {
            ingredient: {
              select: {
                id: true,
                name: true,
              },
            },
          },
        },
      },
    });

    if (!transaction) {
      return { success: false, error: 'Transaction not found' };
    }

    // Verify user belongs to the bakery
    if (currentUser.bakeryId !== transaction.inventoryItem.bakeryId && !currentUser.isPlatformAdmin) {
      return {
        success: false,
        error: 'Unauthorized: Transaction does not belong to your bakery',
      };
    }

    // Calculate reverse quantity delta
    let quantityDelta = new Decimal(transaction.quantity);

    switch (transaction.type) {
      case 'RECEIVE':
        // Reverse: subtract what was added
        quantityDelta = quantityDelta.abs().negated();
        break;
      case 'USE':
      case 'WASTE':
        // Reverse: add back what was subtracted
        quantityDelta = quantityDelta.abs();
        break;
      case 'ADJUST':
        // Reverse the adjustment
        quantityDelta = quantityDelta.negated();
        break;
    }

    const newQuantity = new Decimal(transaction.inventoryItem.quantity).plus(
      quantityDelta
    );

    // Validate new quantity is not negative
    if (newQuantity.isNegative()) {
      return {
        success: false,
        error: `Cannot delete transaction: Would result in negative inventory for ${transaction.inventoryItem.ingredient.name}`,
      };
    }

    // Delete transaction and update inventory item in a transaction
    await db.$transaction(async (tx) => {
      // Delete the transaction
      await tx.inventoryTransaction.delete({
        where: { id: transactionId },
      });

      // Update inventory item quantity
      await tx.inventoryItem.update({
        where: { id: transaction.inventoryItemId },
        data: {
          quantity: newQuantity,
        },
      });
    });

    // Log activity
    await createActivityLog({
      userId: currentUser.id,
      action: 'DELETE',
      entityType: 'inventory_transaction',
      entityId: transaction.id,
      entityName: `${transaction.type} transaction for ${transaction.inventoryItem.ingredient.name}`,
      description: `Deleted ${transaction.type.toLowerCase()} transaction for "${transaction.inventoryItem.ingredient.name}" and reversed quantity change`,
      metadata: {
        transactionType: transaction.type,
        inventoryItemId: transaction.inventoryItem.id,
        ingredientId: transaction.inventoryItem.ingredient.id,
        ingredientName: transaction.inventoryItem.ingredient.name,
        quantity: Number(transaction.quantity),
        unit: transaction.unit,
      },
      bakeryId: transaction.inventoryItem.bakeryId,
    });

    revalidatePath('/dashboard/inventory');
    revalidatePath(`/dashboard/ingredients/${transaction.inventoryItem.ingredientId}`);

    return { success: true };
  } catch (error) {
    console.error('Failed to delete inventory transaction:', error);
    return {
      success: false,
      error:
        error instanceof Error ? error.message : 'Failed to delete transaction',
    };
  }
}
