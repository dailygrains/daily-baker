import { prisma } from './prisma';
import type { User, Role } from '@/generated/prisma';

/**
 * Check if user has a specific bakery-level permission
 * Platform admins automatically have all permissions
 */
export async function hasPermission(
  userId: string,
  permission: string
): Promise<boolean> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    include: { role: true },
  });

  if (!user) {
    return false;
  }

  // Platform admins have all permissions
  if (user.isPlatformAdmin) {
    return true;
  }

  // Check bakery-level role permissions
  if (!user.role) {
    return false;
  }

  const permissions = user.role.permissions as Record<string, boolean>;
  return permissions[permission] === true;
}

/**
 * Check if user is platform admin
 */
export async function checkPlatformAdmin(userId: string): Promise<boolean> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { isPlatformAdmin: true },
  });

  return user?.isPlatformAdmin ?? false;
}

/**
 * Get all permissions for a user
 * Returns empty object for non-admin users without roles
 */
export async function getUserPermissions(
  userId: string
): Promise<Record<string, boolean>> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    include: { role: true },
  });

  if (!user) {
    return {};
  }

  // Platform admins have all permissions
  if (user.isPlatformAdmin) {
    return {
      // Platform permissions
      'platform.manage': true,
      'bakeries.create': true,
      'bakeries.read': true,
      'bakeries.edit': true,
      'bakeries.delete': true,
      'users.view_all': true,
      'users.assign_bakery': true,
      'users.promote_admin': true,

      // All bakery permissions
      'recipes.read': true,
      'recipes.write': true,
      'recipes.delete': true,
      'ingredients.read': true,
      'ingredients.write': true,
      'ingredients.delete': true,
      'inventory.read': true,
      'inventory.write': true,
      'inventory.adjust': true,
      'vendors.read': true,
      'vendors.write': true,
      'vendors.delete': true,
      'equipment.read': true,
      'equipment.write': true,
      'equipment.delete': true,
      'bake-sheets.read': true,
      'bake-sheets.write': true,
      'bake-sheets.delete': true,
      'bake-sheets.complete': true,
      'users.manage': true,
      'roles.manage': true,
    };
  }

  // Return bakery-level permissions from role
  return (user.role?.permissions as Record<string, boolean>) ?? {};
}

/**
 * Require specific permission - throws if user doesn't have it
 */
export async function requirePermission(
  userId: string,
  permission: string
): Promise<void> {
  const hasAccess = await hasPermission(userId, permission);
  if (!hasAccess) {
    throw new Error(`Permission denied: ${permission}`);
  }
}

/**
 * Check multiple permissions - returns true only if user has ALL
 */
export async function hasAllPermissions(
  userId: string,
  permissions: string[]
): Promise<boolean> {
  const results = await Promise.all(
    permissions.map((perm) => hasPermission(userId, perm))
  );
  return results.every((result) => result === true);
}

/**
 * Check multiple permissions - returns true if user has ANY
 */
export async function hasAnyPermission(
  userId: string,
  permissions: string[]
): Promise<boolean> {
  const results = await Promise.all(
    permissions.map((perm) => hasPermission(userId, perm))
  );
  return results.some((result) => result === true);
}

/**
 * Create a permission checker function for a specific user
 * Useful for repeated permission checks
 */
export function createPermissionChecker(user: User & { role: Role | null }) {
  const permissions = (user.role?.permissions as Record<string, boolean>) ?? {};

  return {
    has: (permission: string): boolean => {
      if (user.isPlatformAdmin) return true;
      return permissions[permission] === true;
    },
    hasAll: (perms: string[]): boolean => {
      if (user.isPlatformAdmin) return true;
      return perms.every((perm) => permissions[perm] === true);
    },
    hasAny: (perms: string[]): boolean => {
      if (user.isPlatformAdmin) return true;
      return perms.some((perm) => permissions[perm] === true);
    },
    isPlatformAdmin: user.isPlatformAdmin,
    permissions,
  };
}
