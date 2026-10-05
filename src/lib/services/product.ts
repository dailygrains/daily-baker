import { Decimal } from '@prisma/client/runtime/library';
import { db } from '@/lib/db';
import { computeRecipeBatchWeightGrams } from '@/lib/recipeWeight';
import { allocateIngredientCost, sumSupplyCost } from '@/lib/productCosting';
import {
  createProductSchema,
  updateProductSchema,
  type ProductVariationInput,
} from '@/lib/validations/product';
import {
  ServiceError,
  assertAllOwned,
  logActivity,
  notFound,
  requireBakery,
  type ServiceContext,
} from './context';

/**
 * Everything needed to allocate one scaled batch across its variations.
 */
export type BatchContext = {
  /** Ingredient cost of the whole scaled batch. */
  batchCost: number;
  /** Weight of the whole scaled batch in grams, or null if not derivable. */
  batchWeightG: number | null;
  /** Non-fatal notes about ingredients that could not be weighed. */
  warnings: string[];
};

export async function loadBatchContext(
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
 * Load unit costs for every supply referenced across a set of variations,
 * scoped to the bakery. Throws if any referenced supply is missing or
 * belongs to another bakery.
 */
async function loadSupplyCosts(
  variations: ProductVariationInput[],
  bakeryId: string
): Promise<Map<string, number>> {
  const supplyIds = [
    ...new Set(variations.flatMap((v) => (v.variationSupplies ?? []).map((s) => s.supplyId))),
  ];
  if (supplyIds.length === 0) return new Map();

  const supplies = await db.supply.findMany({
    where: { id: { in: supplyIds }, bakeryId },
    select: { id: true, costPerUnit: true },
  });
  if (supplies.length !== supplyIds.length) {
    throw new ServiceError(422, 'Supply not found or belongs to another bakery');
  }

  return new Map(supplies.map((s) => [s.id, Number(s.costPerUnit)]));
}

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

const productInclude = {
  variations: {
    orderBy: { sortOrder: 'asc' as const },
    include: { variationSupplies: true },
  },
};

async function requireBatchContext(recipeId: string, recipeScale: number) {
  const batch = await loadBatchContext(recipeId, recipeScale);
  if (!batch) throw notFound('Recipe');
  return batch;
}

export async function createProduct(ctx: ServiceContext, input: unknown) {
  const bakeryId = requireBakery(ctx);
  const { variations, ...data } = createProductSchema.parse({ ...(input as object), bakeryId });

  await assertAllOwned('recipe', [data.recipeId], bakeryId, 'Recipe');
  const batch = await requireBatchContext(data.recipeId, data.recipeScale);
  const costMap = await loadSupplyCosts(variations, bakeryId);

  const built = variations.map((v) => ({ variation: v, ...buildVariationData(v, batch, costMap) }));

  const product = await db.product.create({
    data: {
      bakeryId,
      name: data.name,
      description: data.description || null,
      squareItemId: data.squareItemId || null,
      recipeId: data.recipeId,
      recipeScale: new Decimal(data.recipeScale),
      isActive: data.isActive,
      variations: {
        create: built.map((b) => ({
          ...b.data,
          variationSupplies: { create: buildSupplyCreateData(b.variation) },
        })),
      },
    },
    include: productInclude,
  });

  await logActivity(ctx, {
    action: 'CREATE',
    entityType: 'product',
    entityId: product.id,
    entityName: product.name,
    description: `Created product "${product.name}" with ${built.length} variation${built.length === 1 ? '' : 's'}`,
    metadata: { productId: product.id, recipeId: data.recipeId },
  });

  const warnings = [...batch.warnings, ...built.map((b) => b.warning)].filter(Boolean) as string[];
  return { product, warnings };
}

export async function updateProduct(ctx: ServiceContext, id: string, input: unknown) {
  const bakeryId = requireBakery(ctx);
  const { variations, ...fields } = updateProductSchema.parse({ ...(input as object), id });

  const existing = await db.product.findFirst({
    where: { id, bakeryId },
    select: { recipeId: true, recipeScale: true, variations: { select: { id: true } } },
  });
  if (!existing) throw notFound('Product');

  if (fields.recipeId && fields.recipeId !== existing.recipeId) {
    await assertAllOwned('recipe', [fields.recipeId], bakeryId, 'Recipe');
  }

  const recipeId = fields.recipeId ?? existing.recipeId;
  const recipeScale = fields.recipeScale ?? Number(existing.recipeScale);
  const batch = await requireBatchContext(recipeId, recipeScale);

  // Resolve supply costs up front so a foreign supply rejects before any write.
  const costMap = variations ? await loadSupplyCosts(variations, bakeryId) : new Map<string, number>();

  const warnings: string[] = [...batch.warnings];

  await db.$transaction(async (tx) => {
    await tx.product.update({
      where: { id },
      data: {
        name: fields.name,
        description: fields.description,
        squareItemId: fields.squareItemId,
        recipeId: fields.recipeId,
        recipeScale: fields.recipeScale != null ? new Decimal(fields.recipeScale) : undefined,
        isActive: fields.isActive,
      },
    });

    // When variations are omitted the caller is only editing product-level
    // fields, but costs still shift with recipe/scale, so recost in place.
    if (variations === undefined) {
      const current = await tx.productVariation.findMany({ where: { productId: id } });

      for (const v of current) {
        const { cost: ingredientCost, warning } = allocateIngredientCost(
          {
            name: v.name,
            unitWeightG: v.unitWeightG != null ? Number(v.unitWeightG) : null,
            batchYieldQty: v.batchYieldQty,
          },
          batch
        );
        if (warning) warnings.push(warning);

        const totalCost =
          ingredientCost + Number(v.supplyCost) + Number(v.laborCost) + Number(v.overheadCost);

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

    const keptIds = variations.map((v) => v.id).filter((vid): vid is string => Boolean(vid));

    // Variations absent from the submitted list are removed.
    await tx.productVariation.deleteMany({
      where: { productId: id, id: { notIn: keptIds.length > 0 ? keptIds : [''] } },
    });

    for (const variation of variations) {
      const built = buildVariationData(variation, batch, costMap);
      if (built.warning) warnings.push(built.warning);

      if (variation.id && existing.variations.some((v) => v.id === variation.id)) {
        await tx.productVariation.update({ where: { id: variation.id }, data: built.data });
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
            productId: id,
            variationSupplies: { create: buildSupplyCreateData(variation) },
          },
        });
      }
    }
  });

  const product = await db.product.findUniqueOrThrow({ where: { id }, include: productInclude });

  await logActivity(ctx, {
    action: 'UPDATE',
    entityType: 'product',
    entityId: id,
    entityName: product.name,
    description: `Updated product "${product.name}"`,
    metadata: { productId: id },
  });

  return { product, warnings };
}

export async function deleteProduct(ctx: ServiceContext, id: string) {
  const bakeryId = requireBakery(ctx);
  const product = await db.product.findFirst({ where: { id, bakeryId } });
  if (!product) throw notFound('Product');

  await db.product.delete({ where: { id } });

  await logActivity(ctx, {
    action: 'DELETE',
    entityType: 'product',
    entityId: product.id,
    entityName: product.name,
    description: `Deleted product "${product.name}"`,
    metadata: { productId: product.id },
  });

  return product;
}

/**
 * Recalculate costs for every variation of a product (call after recipe or
 * supply costs change).
 */
export async function recalculateProductCost(ctx: ServiceContext, id: string) {
  const bakeryId = requireBakery(ctx);
  const product = await db.product.findFirst({
    where: { id, bakeryId },
    select: {
      recipeId: true,
      recipeScale: true,
      variations: {
        include: {
          variationSupplies: { include: { supply: { select: { costPerUnit: true } } } },
        },
      },
    },
  });
  if (!product) throw notFound('Product');

  const batch = await requireBatchContext(product.recipeId, Number(product.recipeScale));
  const warnings: string[] = [...batch.warnings];

  await db.$transaction(
    product.variations.map((v) => {
      const { cost: ingredientCost, warning } = allocateIngredientCost(
        {
          name: v.name,
          unitWeightG: v.unitWeightG != null ? Number(v.unitWeightG) : null,
          batchYieldQty: v.batchYieldQty,
        },
        batch
      );
      if (warning) warnings.push(warning);

      // Re-price the BOM against current supply costs.
      const supplyCost = v.variationSupplies.reduce((sum, line) => {
        const unitCost =
          line.costOverride != null ? Number(line.costOverride) : Number(line.supply.costPerUnit);
        return sum + unitCost * Number(line.quantity) * Number(line.wasteFactor);
      }, 0);

      const totalCost = ingredientCost + supplyCost + Number(v.laborCost) + Number(v.overheadCost);

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

  const updated = await db.product.findUniqueOrThrow({ where: { id }, include: productInclude });
  return { product: updated, warnings };
}
