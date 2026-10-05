import { db } from '@/lib/db';
import { createBakerySchema, updateBakerySchema } from '@/lib/validations/bakery';
import { ServiceError, logActivity, notFound, type ServiceContext } from './context';
import { isForeignKeyError, requireAdmin } from './admin';

/**
 * Generate a URL-friendly slug from a string
 */
function generateSlug(name: string): string {
  return name
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, '') // Remove special characters
    .replace(/\s+/g, '-') // Replace spaces with hyphens
    .replace(/-+/g, '-') // Replace multiple hyphens with single hyphen
    .replace(/^-+|-+$/g, ''); // Remove leading/trailing hyphens
}

/** A slug derived from the name, suffixed with -1, -2... until unused. */
async function uniqueSlug(name: string) {
  const base = generateSlug(name) || 'bakery';
  let slug = base;
  for (let suffix = 1; await db.bakery.findUnique({ where: { slug } }); suffix++) {
    slug = `${base}-${suffix}`;
  }
  return slug;
}

export async function createBakery(ctx: ServiceContext, input: unknown) {
  requireAdmin(ctx, 'create bakeries');
  const data = createBakerySchema.parse(input);

  const bakery = await db.bakery.create({
    data: { ...data, slug: await uniqueSlug(data.name) },
  });

  await logActivity(ctx, {
    action: 'CREATE',
    entityType: 'bakery',
    entityId: bakery.id,
    entityName: bakery.name,
    description: `Created bakery "${bakery.name}"`,
    metadata: { bakeryId: bakery.id },
    bakeryId: bakery.id,
  });

  return bakery;
}

export async function updateBakery(ctx: ServiceContext, id: string, input: unknown) {
  requireAdmin(ctx, 'update bakeries');
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const { id: _id, ...updateData } = updateBakerySchema.parse({ ...(input as object), id });

  const existing = await db.bakery.findUnique({ where: { id }, select: { id: true } });
  if (!existing) throw notFound('Bakery');

  const bakery = await db.bakery.update({ where: { id }, data: updateData });

  await logActivity(ctx, {
    action: 'UPDATE',
    entityType: 'bakery',
    entityId: bakery.id,
    entityName: bakery.name,
    description: `Updated bakery "${bakery.name}"`,
    metadata: { bakeryId: bakery.id, updatedFields: Object.keys(updateData) },
    bakeryId: bakery.id,
  });

  return bakery;
}

/**
 * Delete a bakery and (by cascade) its tenant data. Blocked while users are
 * assigned, as in the dashboard. Recipes referenced by products, sheets or
 * recipe lines are protected by Restrict foreign keys, which surface as 409.
 */
export async function deleteBakery(ctx: ServiceContext, id: string) {
  requireAdmin(ctx, 'delete bakeries');

  const bakery = await db.bakery.findUnique({
    where: { id },
    include: { _count: { select: { users: true } } },
  });
  if (!bakery) throw notFound('Bakery');

  if (bakery._count.users > 0) {
    throw new ServiceError(
      409,
      `Cannot delete bakery with ${bakery._count.users} active user(s). Please reassign or remove users first.`
    );
  }

  try {
    await db.bakery.delete({ where: { id } });
  } catch (error) {
    if (isForeignKeyError(error)) {
      throw new ServiceError(
        409,
        'Cannot delete bakery because its recipes are still used by products, production sheets or recipe ingredients. Please remove them first.'
      );
    }
    throw error;
  }

  // The bakery is gone, so the log entry can't point at it.
  await logActivity(ctx, {
    action: 'DELETE',
    entityType: 'bakery',
    entityId: bakery.id,
    entityName: bakery.name,
    description: `Deleted bakery "${bakery.name}"`,
    metadata: { bakeryId: bakery.id },
  });

  return bakery;
}
