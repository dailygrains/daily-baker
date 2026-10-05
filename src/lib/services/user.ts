import { db } from '@/lib/db';
import { updateUserSchema } from '@/lib/validations/user';
import { ServiceError, logActivity, notFound, type ServiceContext } from './context';
import { requireAdmin } from './admin';

/**
 * Users are created by Clerk sign-up, so there is no create here. Platform
 * admins can rename users, set their role, link them to bakeries and delete
 * them.
 */

const userInclude = {
  bakeries: { include: { bakery: true } },
  role: true,
};

const displayName = (user: { name: string | null; email: string }) => user.name || user.email;

async function findUser(id: string) {
  const user = await db.user.findUnique({ where: { id }, select: { id: true, name: true, email: true } });
  if (!user) throw notFound('User');
  return user;
}

async function assertRoleExists(roleId: string | null | undefined) {
  if (!roleId) return;
  const role = await db.role.findUnique({ where: { id: roleId }, select: { id: true } });
  if (!role) throw new ServiceError(422, 'Role not found');
}

export async function updateUser(ctx: ServiceContext, id: string, input: unknown) {
  requireAdmin(ctx, 'update users');
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const { id: _id, ...updateData } = updateUserSchema.parse({ ...(input as object), id });

  await findUser(id);
  await assertRoleExists(updateData.roleId);

  const user = await db.user.update({ where: { id }, data: updateData, include: userInclude });

  await logActivity(ctx, {
    action: 'UPDATE',
    entityType: 'user',
    entityId: user.id,
    entityName: displayName(user),
    description: `Updated user ${displayName(user)}`,
    metadata: { userId: user.id, updatedFields: Object.keys(updateData) },
    bakeryId: user.bakeries[0]?.bakeryId ?? null,
  });

  return user;
}

export async function assignUserRole(ctx: ServiceContext, userId: string, roleId: string | null) {
  requireAdmin(ctx, 'assign roles');
  await findUser(userId);
  await assertRoleExists(roleId);

  const user = await db.user.update({
    where: { id: userId },
    data: { roleId },
    include: userInclude,
  });

  await logActivity(ctx, {
    action: 'ASSIGN',
    entityType: 'user',
    entityId: user.id,
    entityName: displayName(user),
    description: roleId
      ? `Assigned role "${user.role?.name}" to ${displayName(user)}`
      : `Removed role from ${displayName(user)}`,
    metadata: { userId: user.id, roleId },
    bakeryId: user.bakeries[0]?.bakeryId ?? null,
  });

  return user;
}

export async function deleteUser(ctx: ServiceContext, id: string) {
  requireAdmin(ctx, 'delete users');

  const user = await db.user.findUnique({
    where: { id },
    select: {
      id: true,
      name: true,
      email: true,
      bakeries: { select: { bakeryId: true } },
      _count: { select: { inventoryUsages: true, sentInvitations: true } },
    },
  });
  if (!user) throw notFound('User');

  // Usage history and sent invitations reference the user (Restrict).
  const usageCount = user._count.inventoryUsages;
  const invitationCount = user._count.sentInvitations;
  if (usageCount > 0 || invitationCount > 0) {
    const reasons = [];
    if (usageCount > 0) {
      reasons.push(`${usageCount} inventory usage record${usageCount === 1 ? '' : 's'}`);
    }
    if (invitationCount > 0) {
      reasons.push(`${invitationCount} sent invitation${invitationCount === 1 ? '' : 's'}`);
    }
    throw new ServiceError(
      409,
      `Cannot delete user because they have ${reasons.join(' and ')}. Please reassign or remove these items before deleting.`
    );
  }

  await db.user.delete({ where: { id } });

  await logActivity(ctx, {
    action: 'DELETE',
    entityType: 'user',
    entityId: user.id,
    entityName: displayName(user),
    description: `Deleted user ${displayName(user)}`,
    metadata: { userId: user.id },
    bakeryId: user.bakeries[0]?.bakeryId ?? null,
  });

  return user;
}

/** Link a user to a bakery. Returns the user with their bakeries and role. */
export async function assignUserToBakery(ctx: ServiceContext, userId: string, bakeryId: string) {
  requireAdmin(ctx, 'assign users to bakeries');
  const target = await findUser(userId);
  const bakery = await db.bakery.findUnique({ where: { id: bakeryId }, select: { id: true, name: true } });
  if (!bakery) throw notFound('Bakery');

  const existing = await db.userBakery.findUnique({
    where: { userId_bakeryId: { userId, bakeryId } },
  });
  if (existing) throw new ServiceError(409, 'User is already assigned to this bakery');

  await db.userBakery.create({ data: { userId, bakeryId } });

  await logActivity(ctx, {
    action: 'ASSIGN',
    entityType: 'user',
    entityId: userId,
    entityName: displayName(target),
    description: `Assigned ${displayName(target)} to bakery "${bakery.name}"`,
    metadata: { userId, bakeryId },
    bakeryId,
  });

  return db.user.findUniqueOrThrow({ where: { id: userId }, include: userInclude });
}

/** Remove a user's link to a bakery. Returns the user with their bakeries and role. */
export async function unassignUserFromBakery(ctx: ServiceContext, userId: string, bakeryId: string) {
  requireAdmin(ctx, 'unassign users from bakeries');
  const target = await findUser(userId);

  const link = await db.userBakery.findUnique({
    where: { userId_bakeryId: { userId, bakeryId } },
    include: { bakery: { select: { name: true } } },
  });
  if (!link) throw new ServiceError(404, 'User is not assigned to this bakery');

  await db.userBakery.delete({ where: { id: link.id } });

  await logActivity(ctx, {
    action: 'REVOKE',
    entityType: 'user',
    entityId: userId,
    entityName: displayName(target),
    description: `Unassigned ${displayName(target)} from bakery "${link.bakery.name}"`,
    metadata: { userId, bakeryId },
    bakeryId,
  });

  return db.user.findUniqueOrThrow({ where: { id: userId }, include: userInclude });
}
