import { Decimal } from '@prisma/client/runtime/library';
import { db } from '@/lib/db';
import {
  addInventoryLotSchema,
  updateInventoryLotSchema,
  updateInventorySettingsSchema,
} from '@/lib/validations/inventory';
import {
  ServiceError,
  assertAllOwned,
  logActivity,
  notFound,
  requireBakery,
  type ServiceContext,
} from './context';

export const lotInclude = {
  inventory: {
    include: { ingredient: { select: { id: true, name: true, unit: true } } },
  },
  vendor: { select: { id: true, name: true } },
};

/** JSON bodies carry dates as strings; the schemas expect Date objects. */
function withDates(input: unknown) {
  const body = { ...(input as Record<string, unknown>) };
  if (typeof body.expiresAt === 'string') body.expiresAt = new Date(body.expiresAt);
  return body;
}

async function findOwnedLot(id: string, bakeryId: string) {
  const lot = await db.inventoryLot.findFirst({
    where: { id, inventory: { bakeryId } },
    include: {
      inventory: { include: { ingredient: true } },
      _count: { select: { usages: true } },
    },
  });
  if (!lot) throw notFound('Inventory lot');
  return lot;
}

/**
 * Record a purchase as a new lot, creating the ingredient's Inventory row on
 * first use.
 */
export async function addInventoryLot(ctx: ServiceContext, input: unknown) {
  const bakeryId = requireBakery(ctx);
  const data = addInventoryLotSchema.parse(withDates(input));

  await assertAllOwned('ingredient', [data.ingredientId], bakeryId, 'Ingredient');
  await assertAllOwned('vendor', [data.vendorId], bakeryId, 'Vendor');

  const ingredient = await db.ingredient.findUniqueOrThrow({
    where: { id: data.ingredientId },
    include: { inventory: true },
  });

  const lot = await db.$transaction(async (tx) => {
    const inventory =
      ingredient.inventory ??
      (await tx.inventory.create({
        data: {
          bakeryId,
          ingredientId: ingredient.id,
          displayUnit: ingredient.unit, // Default to ingredient's unit
        },
      }));

    // Cost per unit is derived from the total cost of the purchase.
    const costPerUnit = data.quantity > 0 ? data.totalCost / data.quantity : 0;

    return tx.inventoryLot.create({
      data: {
        inventoryId: inventory.id,
        purchaseQty: new Decimal(data.quantity),
        remainingQty: new Decimal(data.quantity),
        purchaseUnit: data.unit,
        costPerUnit: new Decimal(costPerUnit),
        expiresAt: data.expiresAt,
        vendorId: data.vendorId,
        notes: data.notes,
      },
      include: lotInclude,
    });
  });

  await logActivity(ctx, {
    action: 'CREATE',
    entityType: 'inventory_lot',
    entityId: lot.id,
    entityName: `${ingredient.name} - ${data.quantity} ${data.unit}`,
    description: `Added ${data.quantity} ${data.unit} of "${ingredient.name}" — total cost $${data.totalCost.toFixed(2)}`,
    metadata: {
      ingredientId: ingredient.id,
      lotId: lot.id,
      quantity: data.quantity,
      unit: data.unit,
      totalCost: data.totalCost,
      vendorId: data.vendorId,
    },
  });

  return lot;
}

/** Update a lot's metadata (expiry, vendor, notes). Quantities are not editable. */
export async function updateInventoryLot(ctx: ServiceContext, id: string, input: unknown) {
  const bakeryId = requireBakery(ctx);
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const { id: _id, ...updateData } = updateInventoryLotSchema.parse({ ...withDates(input), id });

  const lot = await findOwnedLot(id, bakeryId);
  await assertAllOwned('vendor', [updateData.vendorId], bakeryId, 'Vendor');

  const updated = await db.inventoryLot.update({
    where: { id },
    data: updateData,
    include: lotInclude,
  });

  await logActivity(ctx, {
    action: 'UPDATE',
    entityType: 'inventory_lot',
    entityId: lot.id,
    entityName: lot.inventory.ingredient.name,
    description: `Updated lot details for "${lot.inventory.ingredient.name}"`,
    metadata: {
      lotId: lot.id,
      ingredientId: lot.inventory.ingredientId,
      updatedFields: Object.keys(updateData),
    },
  });

  return updated;
}

/** Delete a lot. Lots with usage records are history and cannot be deleted. */
export async function deleteInventoryLot(ctx: ServiceContext, id: string) {
  const bakeryId = requireBakery(ctx);
  const lot = await findOwnedLot(id, bakeryId);

  if (lot._count.usages > 0) {
    throw new ServiceError(
      409,
      `Cannot delete lot with ${lot._count.usages} usage record(s). Lot has been partially or fully used.`
    );
  }

  await db.inventoryLot.delete({ where: { id } });

  await logActivity(ctx, {
    action: 'DELETE',
    entityType: 'inventory_lot',
    entityId: lot.id,
    entityName: lot.inventory.ingredient.name,
    description: `Deleted unused lot for "${lot.inventory.ingredient.name}" (${lot.purchaseQty} ${lot.purchaseUnit})`,
    metadata: {
      lotId: lot.id,
      ingredientId: lot.inventory.ingredientId,
      quantity: Number(lot.purchaseQty),
      unit: lot.purchaseUnit,
    },
  });

  return lot;
}

/**
 * Update an Inventory row's settings. Only lowStockThreshold is writable, the
 * same field the dashboard edits (via the ingredient form). Inventory rows are
 * created implicitly with the first lot and removed with their ingredient.
 */
export async function updateInventorySettings(ctx: ServiceContext, id: string, input: unknown) {
  const bakeryId = requireBakery(ctx);
  const data = updateInventorySettingsSchema.parse(input);

  const inventory = await db.inventory.findFirst({
    where: { id, bakeryId },
    include: { ingredient: { select: { name: true } } },
  });
  if (!inventory) throw notFound('Inventory');

  const updated = await db.inventory.update({ where: { id }, data });

  await logActivity(ctx, {
    action: 'UPDATE',
    entityType: 'inventory',
    entityId: inventory.id,
    entityName: inventory.ingredient.name,
    description: `Updated inventory settings for "${inventory.ingredient.name}"`,
    metadata: { ingredientId: inventory.ingredientId, updatedFields: Object.keys(data) },
  });

  return updated;
}
