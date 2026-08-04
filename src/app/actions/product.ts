'use server';

import { db } from '@/lib/db';
import { getCurrentUser } from '@/lib/clerk';
import { createActivityLog } from './activity';
import {
  createProductSchema,
  updateProductSchema,
  type CreateProductInput,
  type UpdateProductInput,
} from '@/lib/validations/product';
import { revalidatePath } from 'next/cache';
import { Decimal } from '@prisma/client/runtime/library';

/**
 * Compute product costs from recipe + supply BOM
 */
async function computeProductCosts(
  recipeId: string,
  recipeScale: number,
  batchYieldQty: number,
  productId?: string
) {
  const recipe = await db.recipe.findUnique({
    where: { id: recipeId },
    select: { totalCost: true },
  });
  if (!recipe) return { ingredientCost: 0, supplyCost: 0 };

  const ingredientCost =
    (Number(recipe.totalCost) * recipeScale) / batchYieldQty;

  let supplyCost = 0;
  if (productId) {
    const bomLines = await db.productSupply.findMany({
      where: { productId },
      include: { supply: { select: { costPerUnit: true } } },
    });
    supplyCost = bomLines.reduce((sum, line) => {
      const unitCost = line.costOverride
        ? Number(line.costOverride)
        : Number(line.supply.costPerUnit);
      return sum + unitCost * Number(line.quantity) * Number(line.wasteFactor);
    }, 0);
  }

  return { ingredientCost, supplyCost };
}

export async function createProduct(data: CreateProductInput) {
  try {
    const currentUser = await getCurrentUser();
    if (!currentUser) {
      return { success: false, error: 'Unauthorized: You must be logged in' };
    }
    if (currentUser.bakeryId !== data.bakeryId) {
      return { success: false, error: 'Unauthorized: You can only create products for your bakery' };
    }

    const validatedData = createProductSchema.parse(data);
    const { productSupplies, ...productData } = validatedData;

    // Verify recipe belongs to same bakery
    const recipe = await db.recipe.findUnique({
      where: { id: productData.recipeId },
      select: { bakeryId: true, totalCost: true },
    });
    if (!recipe || recipe.bakeryId !== productData.bakeryId) {
      return { success: false, error: 'Recipe not found or belongs to another bakery' };
    }

    const ingredientCost =
      (Number(recipe.totalCost) * productData.recipeScale) / productData.batchYieldQty;

    // Compute supply cost from BOM lines if provided
    let supplyCost = 0;
    if (productSupplies && productSupplies.length > 0) {
      const supplyIds = productSupplies.map((ps) => ps.supplyId);
      const supplies = await db.supply.findMany({
        where: { id: { in: supplyIds } },
        select: { id: true, costPerUnit: true },
      });
      const costMap = new Map(supplies.map((s) => [s.id, Number(s.costPerUnit)]));
      supplyCost = productSupplies.reduce((sum, line) => {
        const unitCost = line.costOverride ?? costMap.get(line.supplyId) ?? 0;
        return sum + unitCost * line.quantity * line.wasteFactor;
      }, 0);
    }

    const totalCost = ingredientCost + supplyCost + productData.laborCost + productData.overheadCost;

    const product = await db.product.create({
      data: {
        bakeryId: productData.bakeryId,
        name: productData.name,
        sku: productData.sku || null,
        description: productData.description || null,
        recipeId: productData.recipeId,
        recipeScale: new Decimal(productData.recipeScale),
        batchYieldQty: productData.batchYieldQty,
        ingredientCost: new Decimal(ingredientCost),
        supplyCost: new Decimal(supplyCost),
        laborCost: new Decimal(productData.laborCost),
        overheadCost: new Decimal(productData.overheadCost),
        totalCost: new Decimal(totalCost),
        retailPrice: productData.retailPrice != null ? new Decimal(productData.retailPrice) : null,
        wholesalePrice: productData.wholesalePrice != null ? new Decimal(productData.wholesalePrice) : null,
        targetMarginPct: productData.targetMarginPct != null ? new Decimal(productData.targetMarginPct) : null,
        ...(productSupplies && productSupplies.length > 0 && {
          productSupplies: {
            create: productSupplies.map((ps) => ({
              supplyId: ps.supplyId,
              quantity: new Decimal(ps.quantity),
              unit: ps.unit,
              wasteFactor: new Decimal(ps.wasteFactor),
              costOverride: ps.costOverride != null ? new Decimal(ps.costOverride) : null,
              notes: ps.notes || null,
            })),
          },
        }),
      },
    });

    await createActivityLog({
      userId: currentUser.id!,
      action: 'CREATE',
      entityType: 'product',
      entityId: product.id,
      entityName: product.name,
      description: `Created product "${product.name}" (cost: $${totalCost.toFixed(2)})`,
      metadata: { productId: product.id, recipeId: productData.recipeId },
      bakeryId: product.bakeryId,
    });

    revalidatePath('/dashboard/products');
    return { success: true, data: product };
  } catch (error) {
    console.error('Failed to create product:', error);
    return { success: false, error: error instanceof Error ? error.message : 'Failed to create product' };
  }
}

export async function updateProduct(data: UpdateProductInput) {
  try {
    const currentUser = await getCurrentUser();
    if (!currentUser) {
      return { success: false, error: 'Unauthorized: You must be logged in' };
    }

    const validatedData = updateProductSchema.parse(data);
    const { productSupplies, ...updateFields } = validatedData;

    const existing = await db.product.findUnique({
      where: { id: validatedData.id },
      select: { bakeryId: true, name: true, recipeId: true, recipeScale: true, batchYieldQty: true, laborCost: true, overheadCost: true },
    });
    if (!existing) {
      return { success: false, error: 'Product not found' };
    }
    if (currentUser.bakeryId !== existing.bakeryId) {
      return { success: false, error: 'Unauthorized: You can only update products for your bakery' };
    }

    // Update BOM lines if provided
    if (productSupplies !== undefined) {
      await db.productSupply.deleteMany({ where: { productId: validatedData.id } });
      if (productSupplies.length > 0) {
        await db.productSupply.createMany({
          data: productSupplies.map((ps) => ({
            productId: validatedData.id,
            supplyId: ps.supplyId,
            quantity: new Decimal(ps.quantity),
            unit: ps.unit,
            wasteFactor: new Decimal(ps.wasteFactor),
            costOverride: ps.costOverride != null ? new Decimal(ps.costOverride) : null,
            notes: ps.notes || null,
          })),
        });
      }
    }

    // Recompute costs
    const recipeId = updateFields.recipeId ?? existing.recipeId;
    const recipeScale = updateFields.recipeScale ?? Number(existing.recipeScale);
    const batchYieldQty = updateFields.batchYieldQty ?? existing.batchYieldQty;
    const laborCost = updateFields.laborCost ?? Number(existing.laborCost);
    const overheadCost = updateFields.overheadCost ?? Number(existing.overheadCost);

    const costs = await computeProductCosts(recipeId, recipeScale, batchYieldQty, validatedData.id);
    const totalCost = costs.ingredientCost + costs.supplyCost + laborCost + overheadCost;

    const product = await db.product.update({
      where: { id: validatedData.id },
      data: {
        name: updateFields.name,
        sku: updateFields.sku,
        description: updateFields.description,
        recipeId: updateFields.recipeId,
        recipeScale: updateFields.recipeScale != null ? new Decimal(updateFields.recipeScale) : undefined,
        batchYieldQty: updateFields.batchYieldQty,
        laborCost: new Decimal(laborCost),
        overheadCost: new Decimal(overheadCost),
        ingredientCost: new Decimal(costs.ingredientCost),
        supplyCost: new Decimal(costs.supplyCost),
        totalCost: new Decimal(totalCost),
        retailPrice: updateFields.retailPrice !== undefined ? (updateFields.retailPrice != null ? new Decimal(updateFields.retailPrice) : null) : undefined,
        wholesalePrice: updateFields.wholesalePrice !== undefined ? (updateFields.wholesalePrice != null ? new Decimal(updateFields.wholesalePrice) : null) : undefined,
        targetMarginPct: updateFields.targetMarginPct !== undefined ? (updateFields.targetMarginPct != null ? new Decimal(updateFields.targetMarginPct) : null) : undefined,
      },
    });

    await createActivityLog({
      userId: currentUser.id!,
      action: 'UPDATE',
      entityType: 'product',
      entityId: product.id,
      entityName: product.name,
      description: `Updated product "${product.name}" (cost: $${totalCost.toFixed(2)})`,
      metadata: { productId: product.id, changes: validatedData },
      bakeryId: product.bakeryId,
    });

    revalidatePath('/dashboard/products');
    revalidatePath(`/dashboard/products/${product.id}`);
    return { success: true, data: product };
  } catch (error) {
    console.error('Failed to update product:', error);
    return { success: false, error: error instanceof Error ? error.message : 'Failed to update product' };
  }
}

export async function deleteProduct(id: string) {
  try {
    const currentUser = await getCurrentUser();
    if (!currentUser) {
      return { success: false, error: 'Unauthorized: You must be logged in' };
    }

    const product = await db.product.findUnique({ where: { id } });
    if (!product) {
      return { success: false, error: 'Product not found' };
    }
    if (currentUser.bakeryId !== product.bakeryId) {
      return { success: false, error: 'Unauthorized: You can only delete products for your bakery' };
    }

    await db.product.delete({ where: { id } });

    await createActivityLog({
      userId: currentUser.id!,
      action: 'DELETE',
      entityType: 'product',
      entityId: product.id,
      entityName: product.name,
      description: `Deleted product "${product.name}"`,
      metadata: { productId: product.id },
      bakeryId: product.bakeryId,
    });

    revalidatePath('/dashboard/products');
    return { success: true };
  } catch (error) {
    console.error('Failed to delete product:', error);
    return { success: false, error: error instanceof Error ? error.message : 'Failed to delete product' };
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
        _count: { select: { productSupplies: true } },
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
        productSupplies: {
          include: {
            supply: { select: { id: true, name: true, unit: true, costPerUnit: true, category: true } },
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
 * Recalculate costs for a product (call after recipe cost changes)
 */
export async function recalculateProductCost(productId: string) {
  try {
    const currentUser = await getCurrentUser();
    if (!currentUser) {
      return { success: false, error: 'Unauthorized: You must be logged in' };
    }

    const product = await db.product.findUnique({
      where: { id: productId },
      select: { bakeryId: true, recipeId: true, recipeScale: true, batchYieldQty: true, laborCost: true, overheadCost: true },
    });
    if (!product) return { success: false, error: 'Product not found' };
    if (currentUser.bakeryId !== product.bakeryId) {
      return { success: false, error: 'Unauthorized: You can only recalculate products for your bakery' };
    }

    const costs = await computeProductCosts(
      product.recipeId,
      Number(product.recipeScale),
      product.batchYieldQty,
      productId
    );
    const totalCost = costs.ingredientCost + costs.supplyCost + Number(product.laborCost) + Number(product.overheadCost);

    await db.product.update({
      where: { id: productId },
      data: {
        ingredientCost: new Decimal(costs.ingredientCost),
        supplyCost: new Decimal(costs.supplyCost),
        totalCost: new Decimal(totalCost),
      },
    });

    return { success: true };
  } catch (error) {
    console.error('Failed to recalculate product cost:', error);
    return { success: false, error: error instanceof Error ? error.message : 'Failed to recalculate' };
  }
}
