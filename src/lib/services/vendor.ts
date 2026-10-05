import { db } from '@/lib/db';
import { createVendorSchema, updateVendorSchema } from '@/lib/validations/vendor';
import {
  ServiceError,
  logActivity,
  notFound,
  requireBakery,
  type ServiceContext,
} from './context';

// The validators also accept `contactName` and `address`, but Vendor has no
// such columns, so only the real fields below are written.

export async function createVendor(ctx: ServiceContext, input: unknown) {
  const bakeryId = requireBakery(ctx);
  const data = createVendorSchema.parse({ ...(input as object), bakeryId });

  const vendor = await db.vendor.create({
    data: {
      bakeryId,
      name: data.name,
      email: data.email || null,
      phone: data.phone || null,
      website: data.website || null,
      notes: data.notes || null,
    },
  });

  await logActivity(ctx, {
    action: 'CREATE',
    entityType: 'vendor',
    entityId: vendor.id,
    entityName: vendor.name,
    description: `Created vendor "${vendor.name}"`,
    metadata: { vendorId: vendor.id },
  });

  return vendor;
}

export async function updateVendor(ctx: ServiceContext, id: string, input: unknown) {
  const bakeryId = requireBakery(ctx);
  const validated = updateVendorSchema.parse({ ...(input as object), id });

  const existing = await db.vendor.findFirst({ where: { id, bakeryId }, select: { id: true } });
  if (!existing) throw notFound('Vendor');

  const vendor = await db.vendor.update({
    where: { id },
    data: {
      name: validated.name,
      email: validated.email,
      phone: validated.phone,
      website: validated.website,
      notes: validated.notes,
    },
  });

  await logActivity(ctx, {
    action: 'UPDATE',
    entityType: 'vendor',
    entityId: vendor.id,
    entityName: vendor.name,
    description: `Updated vendor "${vendor.name}"`,
    metadata: { vendorId: vendor.id, changes: validated },
  });

  return vendor;
}

export async function deleteVendor(ctx: ServiceContext, id: string) {
  const bakeryId = requireBakery(ctx);
  const vendor = await db.vendor.findFirst({
    where: { id, bakeryId },
    include: { _count: { select: { ingredients: true, equipment: true } } },
  });
  if (!vendor) throw notFound('Vendor');

  // Links would otherwise be cascaded (ingredients) or nulled (equipment).
  const { ingredients, equipment } = vendor._count;
  if (ingredients > 0 || equipment > 0) {
    throw new ServiceError(
      409,
      `Cannot delete vendor with ${ingredients} linked ingredient(s) and ${equipment} linked equipment item(s). Please unlink them first.`
    );
  }

  // Tag assignments have no foreign key to the tagged row, so remove them here.
  await db.$transaction([
    db.entityTag.deleteMany({ where: { entityType: 'vendor', entityId: id } }),
    db.vendor.delete({ where: { id } }),
  ]);

  await logActivity(ctx, {
    action: 'DELETE',
    entityType: 'vendor',
    entityId: vendor.id,
    entityName: vendor.name,
    description: `Deleted vendor "${vendor.name}"`,
    metadata: { vendorId: vendor.id },
  });

  return vendor;
}
