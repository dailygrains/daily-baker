import { Decimal } from '@prisma/client/runtime/library';
import { db } from '@/lib/db';
import { createEquipmentSchema, updateEquipmentSchema } from '@/lib/validations/equipment';
import {
  assertAllOwned,
  logActivity,
  notFound,
  requireBakery,
  type ServiceContext,
} from './context';

/**
 * The validators expect `purchaseDate` as a Date (what the dashboard form
 * sends). JSON callers can only send strings, so turn an ISO string into a
 * Date first; an unparseable string becomes an Invalid Date and fails
 * validation. An empty string clears the date.
 */
function withParsedDates(input: unknown): Record<string, unknown> {
  const body = { ...(input as Record<string, unknown>) };
  if (typeof body.purchaseDate === 'string') {
    body.purchaseDate = body.purchaseDate === '' ? null : new Date(body.purchaseDate);
  }
  return body;
}

export async function createEquipment(ctx: ServiceContext, input: unknown) {
  const bakeryId = requireBakery(ctx);
  const data = createEquipmentSchema.parse({ ...withParsedDates(input), bakeryId });

  await assertAllOwned('vendor', [data.vendorId], bakeryId, 'Vendor');

  const equipment = await db.equipment.create({
    data: {
      bakeryId,
      name: data.name,
      status: data.status,
      vendorId: data.vendorId || null,
      purchaseDate: data.purchaseDate || null,
      cost: data.cost != null ? new Decimal(data.cost) : null,
      quantity: data.quantity,
      serialNumber: data.serialNumber || null,
      notes: data.notes || null,
    },
  });

  await logActivity(ctx, {
    action: 'CREATE',
    entityType: 'equipment',
    entityId: equipment.id,
    entityName: equipment.name,
    description: `Created equipment "${equipment.name}" with status ${equipment.status}`,
    metadata: {
      equipmentId: equipment.id,
      status: equipment.status,
      quantity: equipment.quantity,
    },
  });

  return equipment;
}

export async function updateEquipment(ctx: ServiceContext, id: string, input: unknown) {
  const bakeryId = requireBakery(ctx);
  const validated = updateEquipmentSchema.parse({ ...withParsedDates(input), id });

  const existing = await db.equipment.findFirst({
    where: { id, bakeryId },
    select: { status: true },
  });
  if (!existing) throw notFound('Equipment');

  await assertAllOwned('vendor', [validated.vendorId], bakeryId, 'Vendor');

  const equipment = await db.equipment.update({
    where: { id },
    data: {
      name: validated.name,
      status: validated.status,
      vendorId: validated.vendorId,
      purchaseDate: validated.purchaseDate,
      // undefined leaves cost alone; null clears it.
      cost: validated.cost != null ? new Decimal(validated.cost) : validated.cost,
      quantity: validated.quantity,
      serialNumber: validated.serialNumber,
      notes: validated.notes,
    },
  });

  const statusChanged = validated.status && validated.status !== existing.status;
  await logActivity(ctx, {
    action: 'UPDATE',
    entityType: 'equipment',
    entityId: equipment.id,
    entityName: equipment.name,
    description: statusChanged
      ? `Updated equipment "${equipment.name}" status from ${existing.status} to ${equipment.status}`
      : `Updated equipment "${equipment.name}"`,
    metadata: {
      equipmentId: equipment.id,
      changes: validated,
      ...(statusChanged && {
        statusChange: { from: existing.status, to: equipment.status },
      }),
    },
  });

  return equipment;
}

export async function deleteEquipment(ctx: ServiceContext, id: string) {
  const bakeryId = requireBakery(ctx);
  const equipment = await db.equipment.findFirst({ where: { id, bakeryId } });
  if (!equipment) throw notFound('Equipment');

  await db.equipment.delete({ where: { id } });

  await logActivity(ctx, {
    action: 'DELETE',
    entityType: 'equipment',
    entityId: equipment.id,
    entityName: equipment.name,
    description: `Deleted equipment "${equipment.name}"`,
    metadata: { equipmentId: equipment.id, status: equipment.status },
  });

  return equipment;
}
