'use server';

import { db } from '@/lib/db';
import { getCurrentUser } from '@/lib/clerk';
import type { CreateProductInput, UpdateProductInput } from '@/lib/validations/product';
import { computeRecipeBatchWeightGrams } from '@/lib/recipeWeight';
import { revalidatePath } from 'next/cache';
import { actionContext, actionError, UNAUTHORIZED, type ActionResult } from '@/lib/services/action';
import * as productService from '@/lib/services/product';

type ProductResult = ActionResult<Awaited<ReturnType<typeof productService.createProduct>>['product']>;

/**
 * Batch weight for a recipe at a given scale, for the product form's live cost
 * preview. Returns null when the recipe's ingredients can't be resolved to a
 * weight, which is the signal to fall back to batch-yield costing.
 */
export async function getRecipeBatchBasis(recipeId: string, recipeScale: number) {
  try {
    const currentUser = await getCurrentUser();
    if (!currentUser) {
      return { success: false, error: 'Unauthorized: You must be logged in' };
    }

    const recipe = await db.recipe.findUnique({
      where: { id: recipeId },
      select: { bakeryId: true, totalCost: true },
    });
    if (!recipe) return { success: false, error: 'Recipe not found' };
    if (currentUser.bakeryId !== recipe.bakeryId) {
      return { success: false, error: 'Unauthorized: You can only view recipes for your bakery' };
    }

    const { totalGrams, unresolved } = await computeRecipeBatchWeightGrams(recipeId);

    return {
      success: true,
      data: {
        batchCost: Number(recipe.totalCost) * recipeScale,
        batchWeightG: totalGrams === null ? null : totalGrams * recipeScale,
        warnings: unresolved.map((u) => u.reason),
      },
    };
  } catch (error) {
    console.error('Failed to compute recipe batch basis:', error);
    return { success: false, error: error instanceof Error ? error.message : 'Failed to compute' };
  }
}

export async function createProduct(data: CreateProductInput): Promise<ProductResult> {
  try {
    const ctx = await actionContext();
    if (!ctx) return UNAUTHORIZED;
    if (ctx.bakeryId !== data.bakeryId) {
      return { success: false, error: 'Unauthorized: You can only create products for your bakery' };
    }

    const { product, warnings } = await productService.createProduct(ctx, data);

    revalidatePath('/dashboard/products');
    return { success: true, data: product, warnings };
  } catch (error) {
    return actionError(error, 'Failed to create product');
  }
}

export async function updateProduct(data: UpdateProductInput): Promise<ProductResult> {
  try {
    const ctx = await actionContext();
    if (!ctx) return UNAUTHORIZED;

    const { product, warnings } = await productService.updateProduct(ctx, data.id, data);

    revalidatePath('/dashboard/products');
    revalidatePath(`/dashboard/products/${data.id}`);
    return { success: true, data: product, warnings };
  } catch (error) {
    return actionError(error, 'Failed to update product');
  }
}

export async function deleteProduct(id: string): Promise<ActionResult> {
  try {
    const ctx = await actionContext();
    if (!ctx) return UNAUTHORIZED;

    await productService.deleteProduct(ctx, id);

    revalidatePath('/dashboard/products');
    return { success: true };
  } catch (error) {
    return actionError(error, 'Failed to delete product');
  }
}

export async function getProductsByBakery(bakeryId: string) {
  try {
    const currentUser = await getCurrentUser();
    if (!currentUser) {
      return { success: false, error: 'Unauthorized: You must be logged in' };
    }
    if (currentUser.bakeryId !== bakeryId) {
      return { success: false, error: 'Unauthorized: You can only view products for your bakery' };
    }

    const products = await db.product.findMany({
      where: { bakeryId },
      include: {
        recipe: { select: { id: true, name: true } },
        variations: { orderBy: { sortOrder: 'asc' } },
        _count: { select: { variations: true } },
      },
      orderBy: { name: 'asc' },
    });

    return { success: true, data: products };
  } catch (error) {
    console.error('Failed to fetch products:', error);
    return { success: false, error: error instanceof Error ? error.message : 'Failed to fetch products' };
  }
}

export async function getProductById(id: string) {
  try {
    const currentUser = await getCurrentUser();
    if (!currentUser) {
      return { success: false, error: 'Unauthorized: You must be logged in' };
    }

    const product = await db.product.findUnique({
      where: { id },
      include: {
        recipe: { select: { id: true, name: true, totalCost: true, yieldQty: true, yieldUnit: true } },
        variations: {
          orderBy: { sortOrder: 'asc' },
          include: {
            variationSupplies: {
              include: {
                supply: { select: { id: true, name: true, unit: true, costPerUnit: true, category: true } },
              },
            },
          },
        },
      },
    });

    if (!product) {
      return { success: false, error: 'Product not found' };
    }
    if (currentUser.bakeryId !== product.bakeryId) {
      return { success: false, error: 'Unauthorized: You can only view products for your bakery' };
    }

    return { success: true, data: product };
  } catch (error) {
    console.error('Failed to fetch product:', error);
    return { success: false, error: error instanceof Error ? error.message : 'Failed to fetch product' };
  }
}

/**
 * Recalculate costs for every variation of a product (call after recipe or
 * supply costs change).
 */
export async function recalculateProductCost(productId: string): Promise<ActionResult> {
  try {
    const ctx = await actionContext();
    if (!ctx) return UNAUTHORIZED;

    const { warnings } = await productService.recalculateProductCost(ctx, productId);

    revalidatePath('/dashboard/products');
    revalidatePath(`/dashboard/products/${productId}`);
    return { success: true, warnings };
  } catch (error) {
    return actionError(error, 'Failed to recalculate');
  }
}
