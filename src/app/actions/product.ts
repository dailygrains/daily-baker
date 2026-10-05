'use server';

import { db } from '@/lib/db';
import { getCurrentUser } from '@/lib/clerk';
import { createActivityLog } from './activity';
import {
  createProductSchema,
  updateProductSchema,
  type CreateProductInput,
  type UpdateProductInput,
  type ProductVariationInput,
} from '@/lib/validations/product';
import { computeRecipeBatchWeightGrams } from '@/lib/recipeWeight';
import { allocateIngredientCost, sumSupplyCost } from '@/lib/productCosting';
import { revalidatePath } from 'next/cache';
import { Decimal } from '@prisma/client/runtime/library';

/**
 * Everything needed to allocate one scaled batch across its variations.
 */
type BatchContext = {
  /** Ingredient cost of the whole scaled batch. */
  batchCost: number;
  /** Weight of the whole scaled batch in grams, or null if not derivable. */
  batchWeightG: number | null;
  /** Non-fatal notes about ingredients that could not be weighed. */
  warnings: string[];
};

async function loadBatchContext(
  recipeId: string,
  recipeScale: number
): Promise<BatchContext | null> {
  const recipe = await db.recipe.findUnique({
    where: { id: recipeId },
    select: { totalCost: true },
  });
  if (!recipe) return null;

  const { totalGrams, unresolved } = await computeRecipeBatchWeightGrams(recipeId);

  return {
    batchCost: Number(recipe.totalCost) * recipeScale,
    batchWeightG: totalGrams === null ? null : totalGrams * recipeScale,
    warnings: unresolved.map((u) => u.reason),
  };
}

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

/**
 * Load unit costs for every supply referenced across a set of variations,
 * scoped to the bakery. Returns null if any referenced supply is missing or
 * belongs to another bakery, so callers can reject the write.
 */
async function loadSupplyCosts(
  variations: ProductVariationInput[],
  bakeryId: string
): Promise<Map<string, number> | null> {
  const supplyIds = [
    ...new Set(variations.flatMap((v) => (v.variationSupplies ?? []).map((s) => s.supplyId))),
  ];
  if (supplyIds.length === 0) return new Map();

  const supplies = await db.supply.findMany({
    where: { id: { in: supplyIds }, bakeryId },
    select: { id: true, costPerUnit: true },
  });
  if (supplies.length !== supplyIds.length) return null;

  return new Map(supplies.map((s) => [s.id, Number(s.costPerUnit)]));
}

const SUPPLY_SCOPE_ERROR = 'Supply not found or belongs to another bakery';

/**
 * Build the Prisma payload for a variation, with all cost fields resolved.
 */
function buildVariationData(
  variation: ProductVariationInput,
  ctx: BatchContext,
  costMap: Map<string, number>
) {
  const { cost: ingredientCost, warning } = allocateIngredientCost(variation, ctx);
  const supplyCost = sumSupplyCost(variation.variationSupplies ?? [], costMap);
  const totalCost = ingredientCost + supplyCost + variation.laborCost + variation.overheadCost;

  return {
    warning,
    totalCost,
    data: {
      name: variation.name,
      sku: variation.sku || null,
      squareVariationId: variation.squareVariationId || null,
      unitWeightG: variation.unitWeightG != null ? new Decimal(variation.unitWeightG) : null,
      batchYieldQty: variation.batchYieldQty ?? null,
      ingredientCost: new Decimal(ingredientCost),
      supplyCost: new Decimal(supplyCost),
      laborCost: new Decimal(variation.laborCost),
      overheadCost: new Decimal(variation.overheadCost),
      totalCost: new Decimal(totalCost),
      retailPrice: variation.retailPrice != null ? new Decimal(variation.retailPrice) : null,
      wholesalePrice:
        variation.wholesalePrice != null ? new Decimal(variation.wholesalePrice) : null,
      targetMarginPct:
        variation.targetMarginPct != null ? new Decimal(variation.targetMarginPct) : null,
      isActive: variation.isActive,
      sortOrder: variation.sortOrder,
    },
  };
}

function buildSupplyCreateData(variation: ProductVariationInput) {
  return (variation.variationSupplies ?? []).map((s) => ({
    supplyId: s.supplyId,
    quantity: new Decimal(s.quantity),
    unit: s.unit,
    wasteFactor: new Decimal(s.wasteFactor),
    costOverride: s.costOverride != null ? new Decimal(s.costOverride) : null,
    notes: s.notes || null,
  }));
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
    const { variations, ...productData } = validatedData;

    // Verify recipe belongs to same bakery
    const recipe = await db.recipe.findUnique({
      where: { id: productData.recipeId },
      select: { bakeryId: true },
    });
    if (!recipe || recipe.bakeryId !== productData.bakeryId) {
      return { success: false, error: 'Recipe not found or belongs to another bakery' };
    }

    const ctx = await loadBatchContext(productData.recipeId, productData.recipeScale);
    if (!ctx) {
      return { success: false, error: 'Recipe not found' };
    }
    const costMap = await loadSupplyCosts(variations, productData.bakeryId);
    if (!costMap) {
      return { success: false, error: SUPPLY_SCOPE_ERROR };
    }

    const built = variations.map((v) => ({ variation: v, ...buildVariationData(v, ctx, costMap) }));

    const product = await db.product.create({
      data: {
        bakeryId: productData.bakeryId,
        name: productData.name,
        description: productData.description || null,
        squareItemId: productData.squareItemId || null,
        recipeId: productData.recipeId,
        recipeScale: new Decimal(productData.recipeScale),
        isActive: productData.isActive,
        variations: {
          create: built.map((b) => ({
            ...b.data,
            variationSupplies: { create: buildSupplyCreateData(b.variation) },
          })),
        },
      },
      include: { variations: true },
    });

    await createActivityLog({
      userId: currentUser.id!,
      action: 'CREATE',
      entityType: 'product',
      entityId: product.id,
      entityName: product.name,
      description: `Created product "${product.name}" with ${built.length} variation${built.length === 1 ? '' : 's'}`,
      metadata: { productId: product.id, recipeId: productData.recipeId },
      bakeryId: product.bakeryId,
    });

    revalidatePath('/dashboard/products');
    return {
      success: true,
      data: product,
      warnings: [...ctx.warnings, ...built.map((b) => b.warning).filter(Boolean)] as string[],
    };
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
    const { variations, ...updateFields } = validatedData;

    const existing = await db.product.findUnique({
      where: { id: validatedData.id },
      select: {
        bakeryId: true,
        recipeId: true,
        recipeScale: true,
        variations: { select: { id: true } },
      },
    });
    if (!existing) {
      return { success: false, error: 'Product not found' };
    }
    if (currentUser.bakeryId !== existing.bakeryId) {
      return { success: false, error: 'Unauthorized: You can only update products for your bakery' };
    }

    // If the recipe is being changed, it must belong to the same bakery.
    if (updateFields.recipeId && updateFields.recipeId !== existing.recipeId) {
      const recipe = await db.recipe.findUnique({
        where: { id: updateFields.recipeId },
        select: { bakeryId: true },
      });
      if (!recipe || recipe.bakeryId !== existing.bakeryId) {
        return { success: false, error: 'Recipe not found or belongs to another bakery' };
      }
    }

    const recipeId = updateFields.recipeId ?? existing.recipeId;
    const recipeScale = updateFields.recipeScale ?? Number(existing.recipeScale);

    const ctx = await loadBatchContext(recipeId, recipeScale);
    if (!ctx) {
      return { success: false, error: 'Recipe not found' };
    }

    // Resolve supply costs up front so a foreign supply rejects before any write.
    const costMap = variations
      ? await loadSupplyCosts(variations, existing.bakeryId)
      : new Map<string, number>();
    if (!costMap) {
      return { success: false, error: SUPPLY_SCOPE_ERROR };
    }

    const warnings: string[] = [...ctx.warnings];

    await db.$transaction(async (tx) => {
      await tx.product.update({
        where: { id: validatedData.id },
        data: {
          name: updateFields.name,
          description: updateFields.description,
          squareItemId: updateFields.squareItemId,
          recipeId: updateFields.recipeId,
          recipeScale:
            updateFields.recipeScale != null ? new Decimal(updateFields.recipeScale) : undefined,
          isActive: updateFields.isActive,
        },
      });

      // When variations are omitted the caller is only editing product-level
      // fields, but costs still shift with recipe/scale, so recost in place.
      if (variations === undefined) {
        const current = await tx.productVariation.findMany({
          where: { productId: validatedData.id },
          include: { variationSupplies: true },
        });

        for (const v of current) {
          const { cost: ingredientCost, warning } = allocateIngredientCost(
            {
              name: v.name,
              unitWeightG: v.unitWeightG != null ? Number(v.unitWeightG) : null,
              batchYieldQty: v.batchYieldQty,
            },
            ctx
          );
          if (warning) warnings.push(warning);

          const supplyCost = Number(v.supplyCost);
          const totalCost =
            ingredientCost + supplyCost + Number(v.laborCost) + Number(v.overheadCost);

          await tx.productVariation.update({
            where: { id: v.id },
            data: {
              ingredientCost: new Decimal(ingredientCost),
              totalCost: new Decimal(totalCost),
            },
          });
        }
        return;
      }

      const keptIds = variations.map((v) => v.id).filter((id): id is string => Boolean(id));

      // Variations absent from the submitted list are removed.
      await tx.productVariation.deleteMany({
        where: { productId: validatedData.id, id: { notIn: keptIds.length > 0 ? keptIds : [''] } },
      });

      for (const variation of variations) {
        const built = buildVariationData(variation, ctx, costMap);
        if (built.warning) warnings.push(built.warning);

        if (variation.id && existing.variations.some((v) => v.id === variation.id)) {
          await tx.productVariation.update({
            where: { id: variation.id },
            data: built.data,
          });
          // Rewrite the BOM wholesale; the submitted list is authoritative.
          await tx.productVariationSupply.deleteMany({ where: { variationId: variation.id } });
          const supplyData = buildSupplyCreateData(variation);
          if (supplyData.length > 0) {
            await tx.productVariationSupply.createMany({
              data: supplyData.map((s) => ({ ...s, variationId: variation.id! })),
            });
          }
        } else {
          await tx.productVariation.create({
            data: {
              ...built.data,
              productId: validatedData.id,
              variationSupplies: { create: buildSupplyCreateData(variation) },
            },
          });
        }
      }
    });

    const product = await db.product.findUnique({
      where: { id: validatedData.id },
      include: { variations: { orderBy: { sortOrder: 'asc' } } },
    });

    await createActivityLog({
      userId: currentUser.id!,
      action: 'UPDATE',
      entityType: 'product',
      entityId: validatedData.id,
      entityName: product?.name ?? '',
      description: `Updated product "${product?.name ?? ''}"`,
      metadata: { productId: validatedData.id },
      bakeryId: existing.bakeryId,
    });

    revalidatePath('/dashboard/products');
    revalidatePath(`/dashboard/products/${validatedData.id}`);
    return { success: true, data: product, warnings };
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
export async function recalculateProductCost(productId: string) {
  try {
    const currentUser = await getCurrentUser();
    if (!currentUser) {
      return { success: false, error: 'Unauthorized: You must be logged in' };
    }

    const product = await db.product.findUnique({
      where: { id: productId },
      select: {
        bakeryId: true,
        recipeId: true,
        recipeScale: true,
        variations: {
          include: {
            variationSupplies: {
              include: { supply: { select: { costPerUnit: true } } },
            },
          },
        },
      },
    });
    if (!product) return { success: false, error: 'Product not found' };
    if (currentUser.bakeryId !== product.bakeryId) {
      return { success: false, error: 'Unauthorized: You can only recalculate products for your bakery' };
    }

    const ctx = await loadBatchContext(product.recipeId, Number(product.recipeScale));
    if (!ctx) return { success: false, error: 'Recipe not found' };

    const warnings: string[] = [...ctx.warnings];

    await db.$transaction(
      product.variations.map((v) => {
        const { cost: ingredientCost, warning } = allocateIngredientCost(
          {
            name: v.name,
            unitWeightG: v.unitWeightG != null ? Number(v.unitWeightG) : null,
            batchYieldQty: v.batchYieldQty,
          },
          ctx
        );
        if (warning) warnings.push(warning);

        // Re-price the BOM against current supply costs.
        const supplyCost = v.variationSupplies.reduce((sum, line) => {
          const unitCost =
            line.costOverride != null
              ? Number(line.costOverride)
              : Number(line.supply.costPerUnit);
          return sum + unitCost * Number(line.quantity) * Number(line.wasteFactor);
        }, 0);

        const totalCost =
          ingredientCost + supplyCost + Number(v.laborCost) + Number(v.overheadCost);

        return db.productVariation.update({
          where: { id: v.id },
          data: {
            ingredientCost: new Decimal(ingredientCost),
            supplyCost: new Decimal(supplyCost),
            totalCost: new Decimal(totalCost),
          },
        });
      })
    );

    revalidatePath('/dashboard/products');
    revalidatePath(`/dashboard/products/${productId}`);
    return { success: true, warnings };
  } catch (error) {
    console.error('Failed to recalculate product cost:', error);
    return { success: false, error: error instanceof Error ? error.message : 'Failed to recalculate' };
  }
}
