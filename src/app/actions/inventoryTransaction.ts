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

/**
 * Create an inventory transaction and update ingredient quantity
 */
export async function createInventoryTransaction(
  data: CreateInventoryTransactionInput
) {
  try {
    const currentUser = await getCurrentUser();

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

    // Get the ingredient to validate and calculate new quantity
    const ingredient = await db.ingredient.findUnique({
      where: { id: validatedData.ingredientId },
      select: {
        id: true,
        name: true,
        currentQty: true,
        unit: true,
        bakeryId: true,
      },
    });

    if (!ingredient) {
      return { success: false, error: 'Ingredient not found' };
    }

    // Verify ingredient belongs to the bakery
    if (ingredient.bakeryId !== validatedData.bakeryId) {
      return {
        success: false,
        error: 'Unauthorized: Ingredient does not belong to your bakery',
      };
    }

    // Calculate quantity delta based on transaction type
    let quantityDelta = new Decimal(validatedData.quantity);

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
    const newQuantity = new Decimal(ingredient.currentQty).plus(quantityDelta);

    // Validate new quantity is not negative
    if (newQuantity.isNegative()) {
      return {
        success: false,
        error: `Insufficient inventory: ${ingredient.name} current quantity is ${ingredient.currentQty} ${ingredient.unit}`,
      };
    }

    // Create transaction and update ingredient in a transaction
    const transaction = await db.$transaction(async (tx) => {
      // Create the inventory transaction
      const newTransaction = await tx.inventoryTransaction.create({
        data: {
          type: validatedData.type,
          ingredientId: validatedData.ingredientId,
          quantity: new Decimal(validatedData.quantity),
          unit: validatedData.unit,
          notes: validatedData.notes || null,
          bakeryId: validatedData.bakeryId,
          userId: currentUser.id,
        },
      });

      // Update ingredient quantity
      await tx.ingredient.update({
        where: { id: validatedData.ingredientId },
        data: {
          currentQty: newQuantity,
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
      entityName: `${validatedData.type} ${validatedData.quantity} ${validatedData.unit} of ${ingredient.name}`,
      description: `Recorded ${validatedData.type.toLowerCase()} transaction for "${ingredient.name}" (${validatedData.quantity} ${validatedData.unit})`,
      metadata: {
        transactionType: validatedData.type,
        ingredientId: ingredient.id,
        ingredientName: ingredient.name,
        quantity: validatedData.quantity,
        unit: validatedData.unit,
        previousQuantity: Number(ingredient.currentQty),
        newQuantity: Number(newQuantity),
      },
      bakeryId: validatedData.bakeryId,
    });

    revalidatePath('/dashboard/inventory');
    revalidatePath(`/dashboard/ingredients/${validatedData.ingredientId}`);

    return {
      success: true,
      data: transaction,
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
    ingredientId?: string;
    startDate?: Date;
    endDate?: Date;
    limit?: number;
  }
) {
  try {
    const currentUser = await getCurrentUser();

    // Verify user belongs to the bakery
    if (currentUser.bakeryId !== bakeryId) {
      return {
        success: false,
        error: 'Unauthorized: You can only view your bakery transactions',
      };
    }

    const where: any = { bakeryId };

    // Apply filters
    if (filters?.type) {
      where.type = filters.type;
    }
    if (filters?.ingredientId) {
      where.ingredientId = filters.ingredientId;
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
        ingredient: {
          select: {
            id: true,
            name: true,
            unit: true,
          },
        },
        user: {
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

    return { success: true, data: transactions };
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
 * Get inventory transactions for a specific ingredient
 */
export async function getInventoryTransactionsByIngredient(
  ingredientId: string
) {
  try {
    const currentUser = await getCurrentUser();

    // Get ingredient to verify ownership
    const ingredient = await db.ingredient.findUnique({
      where: { id: ingredientId },
      select: { bakeryId: true },
    });

    if (!ingredient) {
      return { success: false, error: 'Ingredient not found' };
    }

    // Verify user belongs to the bakery
    if (currentUser.bakeryId !== ingredient.bakeryId) {
      return {
        success: false,
        error: 'Unauthorized: Ingredient does not belong to your bakery',
      };
    }

    const transactions = await db.inventoryTransaction.findMany({
      where: { ingredientId },
      include: {
        user: {
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

    return { success: true, data: transactions };
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

    // Get the transaction
    const transaction = await db.inventoryTransaction.findUnique({
      where: { id: transactionId },
      include: {
        ingredient: {
          select: {
            id: true,
            name: true,
            currentQty: true,
            bakeryId: true,
          },
        },
      },
    });

    if (!transaction) {
      return { success: false, error: 'Transaction not found' };
    }

    // Verify user belongs to the bakery
    if (currentUser.bakeryId !== transaction.bakeryId) {
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

    const newQuantity = new Decimal(transaction.ingredient.currentQty).plus(
      quantityDelta
    );

    // Validate new quantity is not negative
    if (newQuantity.isNegative()) {
      return {
        success: false,
        error: `Cannot delete transaction: Would result in negative inventory for ${transaction.ingredient.name}`,
      };
    }

    // Delete transaction and update ingredient in a transaction
    await db.$transaction(async (tx) => {
      // Delete the transaction
      await tx.inventoryTransaction.delete({
        where: { id: transactionId },
      });

      // Update ingredient quantity
      await tx.ingredient.update({
        where: { id: transaction.ingredientId },
        data: {
          currentQty: newQuantity,
        },
      });
    });

    // Log activity
    await createActivityLog({
      userId: currentUser.id,
      action: 'DELETE',
      entityType: 'inventory_transaction',
      entityId: transaction.id,
      entityName: `${transaction.type} transaction for ${transaction.ingredient.name}`,
      description: `Deleted ${transaction.type.toLowerCase()} transaction for "${transaction.ingredient.name}" and reversed quantity change`,
      metadata: {
        transactionType: transaction.type,
        ingredientId: transaction.ingredient.id,
        ingredientName: transaction.ingredient.name,
        quantity: Number(transaction.quantity),
        unit: transaction.unit,
      },
      bakeryId: transaction.bakeryId,
    });

    revalidatePath('/dashboard/inventory');
    revalidatePath(`/dashboard/ingredients/${transaction.ingredientId}`);

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
