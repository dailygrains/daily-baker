import { db } from '@/lib/db';
import { createRoleSchema, updateRoleSchema } from '@/lib/validations/role';
import { ServiceError, logActivity, notFound, type ServiceContext } from './context';
import { requireAdmin } from './admin';

/** Roles are platform-wide (no bakeryId) and managed by platform admins. */

async function assertNameFree(name: string, exceptId?: string) {
  const clash = await db.role.findUnique({ where: { name } });
  if (clash && clash.id !== exceptId) {
    throw new ServiceError(409, `A role named "${name}" already exists`);
  }
}

export async function createRole(ctx: ServiceContext, input: unknown) {
  requireAdmin(ctx, 'create roles');
  const data = createRoleSchema.parse(input);
  await assertNameFree(data.name);

  const role = await db.role.create({
    data: {
      name: data.name,
      description: data.description || null,
      permissions: data.permissions,
    },
  });

  await logActivity(ctx, {
    action: 'CREATE',
    entityType: 'role',
    entityId: role.id,
    entityName: role.name,
    description: `Created platform role "${role.name}"`,
    metadata: { roleId: role.id },
  });

  return role;
}

export async function updateRole(ctx: ServiceContext, id: string, input: unknown) {
  requireAdmin(ctx, 'update roles');
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const { id: _id, ...updateData } = updateRoleSchema.parse({ ...(input as object), id });

  const existing = await db.role.findUnique({ where: { id } });
  if (!existing) throw notFound('Role');
  if (updateData.name) await assertNameFree(updateData.name, id);

  const role = await db.role.update({ where: { id }, data: updateData });

  await logActivity(ctx, {
    action: 'UPDATE',
    entityType: 'role',
    entityId: role.id,
    entityName: role.name,
    description: `Updated platform role "${role.name}"`,
    metadata: { roleId: role.id, updatedFields: Object.keys(updateData) },
  });

  return role;
}

export async function deleteRole(ctx: ServiceContext, id: string) {
  requireAdmin(ctx, 'delete roles');

  const role = await db.role.findUnique({
    where: { id },
    include: { _count: { select: { users: true } } },
  });
  if (!role) throw notFound('Role');

  if (role._count.users > 0) {
    throw new ServiceError(
      409,
      `Cannot delete role with ${role._count.users} assigned user(s). Please reassign users first.`
    );
  }

  await db.role.delete({ where: { id } });

  await logActivity(ctx, {
    action: 'DELETE',
    entityType: 'role',
    entityId: role.id,
    entityName: role.name,
    description: `Deleted platform role "${role.name}"`,
    metadata: { roleId: role.id },
  });

  return role;
}
