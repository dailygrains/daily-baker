import { db } from '@/lib/db';
import {
  assignIngredientVendorSchema,
  createIngredientSchema,
  updateIngredientSchema,
} from '@/lib/validations/ingredient';
import {
  ServiceError,
  assertAllOwned,
  logActivity,
  notFound,
  requireBakery,
  type ServiceContext,
} from './context';

const ingredientInclude = {
  vendors: { include: { vendor: true } },
};

const ingredientWithInventoryInclude = {
  ...ingredientInclude,
  inventory: { include: { lots: true } },
};

async function findOwnedIngredient(id: string, bakeryId: string) {
  const ingredient = await db.ingredient.findFirst({ where: { id, bakeryId } });
  if (!ingredient) throw notFound('Ingredient');
  return ingredient;
}

export async function createIngredient(ctx: ServiceContext, input: unknown) {
  const bakeryId = requireBakery(ctx);
  const data = createIngredientSchema.parse({ ...(input as object), bakeryId });

  const ingredient = await db.ingredient.create({
    data: {
      bakeryId,
      name: data.name,
      unit: data.unit,
      densityGramsPerMl: data.densityGramsPerMl ?? null,
    },
    include: ingredientInclude,
  });

  await logActivity(ctx, {
    action: 'CREATE',
    entityType: 'ingredient',
    entityId: ingredient.id,
    entityName: ingredient.name,
    description: `Created ingredient "${ingredient.name}"`,
    metadata: { ingredientId: ingredient.id, unit: ingredient.unit },
  });

  return ingredient;
}

/**
 * Update an ingredient. `lowStockThreshold` is not an Ingredient column: it
 * lives on the ingredient's Inventory row, which is created if needed.
 */
export async function updateIngredient(ctx: ServiceContext, id: string, input: unknown) {
  const bakeryId = requireBakery(ctx);
  const validated = updateIngredientSchema.parse({ ...(input as object), id });
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const { id: _id, lowStockThreshold, ...updateData } = validated;

  const existing = await db.ingredient.findFirst({
    where: { id, bakeryId },
    include: { inventory: { select: { id: true } } },
  });
  if (!existing) throw notFound('Ingredient');

  const ingredient = await db.$transaction(async (tx) => {
    const updated = await tx.ingredient.update({ where: { id }, data: updateData });

    if (lowStockThreshold !== undefined) {
      if (existing.inventory) {
        await tx.inventory.update({
          where: { id: existing.inventory.id },
          data: { lowStockThreshold },
        });
      } else if (lowStockThreshold !== null) {
        await tx.inventory.create({
          data: {
            bakeryId,
            ingredientId: id,
            displayUnit: updated.unit,
            lowStockThreshold,
          },
        });
      }
    }

    return tx.ingredient.findUniqueOrThrow({
      where: { id },
      include: ingredientWithInventoryInclude,
    });
  });

  await logActivity(ctx, {
    action: 'UPDATE',
    entityType: 'ingredient',
    entityId: ingredient.id,
    entityName: ingredient.name,
    description: `Updated ingredient "${ingredient.name}"`,
    metadata: { ingredientId: ingredient.id, updatedFields: Object.keys(updateData) },
  });

  return ingredient;
}

export async function deleteIngredient(ctx: ServiceContext, id: string) {
  const bakeryId = requireBakery(ctx);
  const ingredient = await db.ingredient.findFirst({
    where: { id, bakeryId },
    include: {
      inventory: { include: { _count: { select: { lots: true } } } },
      _count: { select: { recipeUses: true } },
    },
  });
  if (!ingredient) throw notFound('Ingredient');

  if (ingredient._count.recipeUses > 0) {
    throw new ServiceError(
      409,
      `Cannot delete ingredient with ${ingredient._count.recipeUses} recipe usage(s). Please remove from recipes first.`
    );
  }

  // Deleting would cascade Inventory -> lots -> usages and wipe history.
  if (ingredient.inventory && ingredient.inventory._count.lots > 0) {
    throw new ServiceError(
      409,
      `Cannot delete ingredient with ${ingredient.inventory._count.lots} inventory lot(s). Please remove inventory first.`
    );
  }

  // Tag assignments have no FK to the tagged row, so clear them explicitly.
  await db.$transaction([
    db.entityTag.deleteMany({ where: { entityType: 'ingredient', entityId: id } }),
    db.ingredient.delete({ where: { id } }),
  ]);

  await logActivity(ctx, {
    action: 'DELETE',
    entityType: 'ingredient',
    entityId: ingredient.id,
    entityName: ingredient.name,
    description: `Deleted ingredient "${ingredient.name}"`,
    metadata: { ingredientId: ingredient.id },
  });

  return ingredient;
}

export async function assignVendorToIngredient(
  ctx: ServiceContext,
  ingredientId: string,
  input: unknown
) {
  const bakeryId = requireBakery(ctx);
  const { vendorId } = assignIngredientVendorSchema.parse(input);

  const ingredient = await findOwnedIngredient(ingredientId, bakeryId);
  await assertAllOwned('vendor', [vendorId], bakeryId, 'Vendor');

  const existing = await db.ingredientVendor.findUnique({
    where: { ingredientId_vendorId: { ingredientId, vendorId } },
  });
  if (existing) {
    throw new ServiceError(409, 'Vendor is already assigned to this ingredient');
  }

  const link = await db.ingredientVendor.create({
    data: { ingredientId, vendorId },
    include: { vendor: true },
  });

  await logActivity(ctx, {
    action: 'ASSIGN',
    entityType: 'ingredient',
    entityId: ingredient.id,
    entityName: ingredient.name,
    description: `Assigned vendor "${link.vendor.name}" to ingredient "${ingredient.name}"`,
    metadata: { ingredientId: ingredient.id, vendorId },
  });

  return link;
}

export async function unassignVendorFromIngredient(
  ctx: ServiceContext,
  ingredientId: string,
  vendorId: string
) {
  const bakeryId = requireBakery(ctx);
  const ingredient = await findOwnedIngredient(ingredientId, bakeryId);

  const link = await db.ingredientVendor.findUnique({
    where: { ingredientId_vendorId: { ingredientId, vendorId } },
    include: { vendor: true },
  });
  if (!link) throw notFound('Vendor assignment');

  await db.ingredientVendor.delete({ where: { id: link.id } });

  await logActivity(ctx, {
    action: 'REVOKE',
    entityType: 'ingredient',
    entityId: ingredient.id,
    entityName: ingredient.name,
    description: `Removed vendor "${link.vendor.name}" from ingredient "${ingredient.name}"`,
    metadata: { ingredientId: ingredient.id, vendorId },
  });

  return link;
}
