'use server';

import { db } from '@/lib/db';
import { getCurrentUser } from '@/lib/clerk';
import { revalidatePath } from 'next/cache';
import { actionContext, actionError, UNAUTHORIZED, type ActionResult } from '@/lib/services/action';
import * as roleService from '@/lib/services/role';
import { getAllRoles } from './user';

type PermissionsObject = Record<string, boolean>;
type RoleResult = ActionResult<Awaited<ReturnType<typeof roleService.createRole>>>;

export async function createRole(data: {
  name: string;
  description?: string;
  permissions: PermissionsObject;
}): Promise<RoleResult> {
  try {
    const ctx = await actionContext();
    if (!ctx) return UNAUTHORIZED;

    const role = await roleService.createRole(ctx, data);

    revalidatePath('/admin/roles');
    return { success: true, data: role };
  } catch (error) {
    return actionError(error, 'Failed to create role');
  }
}

export async function updateRole(data: {
  id: string;
  name?: string;
  description?: string;
  permissions?: PermissionsObject;
}): Promise<RoleResult> {
  try {
    const ctx = await actionContext();
    if (!ctx) return UNAUTHORIZED;

    const role = await roleService.updateRole(ctx, data.id, data);

    revalidatePath('/admin/roles');
    return { success: true, data: role };
  } catch (error) {
    return actionError(error, 'Failed to update role');
  }
}

export async function deleteRole(id: string): Promise<ActionResult> {
  try {
    const ctx = await actionContext();
    if (!ctx) return UNAUTHORIZED;

    await roleService.deleteRole(ctx, id);

    revalidatePath('/admin/roles');
    return { success: true };
  } catch (error) {
    return actionError(error, 'Failed to delete role');
  }
}

// Deprecated: Roles are now platform-wide, use getAllRoles() instead
// eslint-disable-next-line @typescript-eslint/no-unused-vars
export async function getRolesByBakery(_bakeryId: string) {
  return getAllRoles();
}

export async function getRoleById(id: string) {
  try {
    const currentUser = await getCurrentUser();

    if (!currentUser?.isPlatformAdmin) {
      return {
        success: false,
        error: 'Unauthorized',
      };
    }

    const role = await db.role.findUnique({
      where: { id },
      include: {
        users: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
        _count: {
          select: {
            users: true,
          },
        },
      },
    });

    if (!role) {
      return {
        success: false,
        error: 'Role not found',
      };
    }

    return {
      success: true,
      data: role,
    };
  } catch (error) {
    console.error('Error fetching role:', error);
    return {
      success: false,
      error: 'Failed to fetch role',
    };
  }
}
