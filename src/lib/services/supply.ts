import { Decimal } from '@prisma/client/runtime/library';
import { db } from '@/lib/db';
import { createSupplySchema, updateSupplySchema } from '@/lib/validations/supply';
import {
  ServiceError,
  assertAllOwned,
  logActivity,
  notFound,
  requireBakery,
  type ServiceContext,
} from './context';

const supplyInclude = { vendors: true };

const vendorLinks = (vendorIds: string[]) => [...new Set(vendorIds)].map((vendorId) => ({ vendorId }));

export async function createSupply(ctx: ServiceContext, input: unknown) {
  const bakeryId = requireBakery(ctx);
  const { vendorIds, ...data } = createSupplySchema.parse({ ...(input as object), bakeryId });

  await assertAllOwned('vendor', vendorIds ?? [], bakeryId, 'Vendor');

  const supply = await db.supply.create({
    data: {
      bakeryId,
      name: data.name,
      sku: data.sku || null,
      category: data.category,
      description: data.description || null,
      unit: data.unit,
      unitsPerCase: data.unitsPerCase || null,
      costPerUnit: new Decimal(data.costPerUnit),
      quantityOnHand: new Decimal(data.quantityOnHand),
      lowStockThreshold: data.lowStockThreshold != null ? new Decimal(data.lowStockThreshold) : null,
      ...(vendorIds && vendorIds.length > 0 && {
        vendors: { create: vendorLinks(vendorIds) },
      }),
    },
    include: supplyInclude,
  });

  await logActivity(ctx, {
    action: 'CREATE',
    entityType: 'supply',
    entityId: supply.id,
    entityName: supply.name,
    description: `Created supply "${supply.name}" (${supply.category})`,
    metadata: { supplyId: supply.id, category: supply.category },
  });

  return supply;
}

export async function updateSupply(ctx: ServiceContext, id: string, input: unknown) {
  const bakeryId = requireBakery(ctx);
  const validated = updateSupplySchema.parse({ ...(input as object), id });
  const { vendorIds, ...fields } = validated;

  const existing = await db.supply.findFirst({ where: { id, bakeryId }, select: { id: true } });
  if (!existing) throw notFound('Supply');

  await assertAllOwned('vendor', vendorIds ?? [], bakeryId, 'Vendor');

  const supply = await db.supply.update({
    where: { id },
    data: {
      name: fields.name,
      sku: fields.sku,
      category: fields.category,
      description: fields.description,
      unit: fields.unit,
      unitsPerCase: fields.unitsPerCase,
      costPerUnit: fields.costPerUnit != null ? new Decimal(fields.costPerUnit) : undefined,
      quantityOnHand: fields.quantityOnHand != null ? new Decimal(fields.quantityOnHand) : undefined,
      lowStockThreshold:
        fields.lowStockThreshold != null ? new Decimal(fields.lowStockThreshold) : undefined,
      // The submitted list is authoritative; omit it to leave links alone.
      ...(vendorIds !== undefined && {
        vendors: { deleteMany: {}, create: vendorLinks(vendorIds) },
      }),
    },
    include: supplyInclude,
  });

  await logActivity(ctx, {
    action: 'UPDATE',
    entityType: 'supply',
    entityId: supply.id,
    entityName: supply.name,
    description: `Updated supply "${supply.name}"`,
    metadata: { supplyId: supply.id, changes: validated },
  });

  return supply;
}

export async function deleteSupply(ctx: ServiceContext, id: string) {
  const bakeryId = requireBakery(ctx);
  const supply = await db.supply.findFirst({
    where: { id, bakeryId },
    include: { productSupplies: { select: { id: true }, take: 1 } },
  });
  if (!supply) throw notFound('Supply');

  if (supply.productSupplies.length > 0) {
    throw new ServiceError(
      409,
      'Cannot delete supply that is used in products. Remove it from all products first.'
    );
  }

  await db.supply.delete({ where: { id } });

  await logActivity(ctx, {
    action: 'DELETE',
    entityType: 'supply',
    entityId: supply.id,
    entityName: supply.name,
    description: `Deleted supply "${supply.name}"`,
    metadata: { supplyId: supply.id, category: supply.category },
  });

  return supply;
}
