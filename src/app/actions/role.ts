'use server';

import { db } from '@/lib/db';
import { getCurrentUser } from '@/lib/clerk';
import { revalidatePath } from 'next/cache';
import { createActivityLog } from './activity-log';
import { getAllRoles } from './user';

type PermissionsObject = Record<string, boolean>;

export async function createRole(data: {
  name: string;
  description?: string;
  permissions: PermissionsObject;
}) {
  try {
    const currentUser = await getCurrentUser();

    if (!currentUser?.isPlatformAdmin) {
      return {
        success: false,
        error: 'Unauthorized: Only platform administrators can create roles',
      };
    }

    const role = await db.role.create({
      data: {
        name: data.name,
        description: data.description || null,
        permissions: data.permissions,
      },
    });

    // Log the activity
    await createActivityLog({
      userId: currentUser.id,
      action: 'CREATE',
      entityType: 'role',
      entityId: role.id,
      entityName: role.name,
      description: `Created platform role "${role.name}"`,
      metadata: { roleId: role.id },
      bakeryId: currentUser.bakeryId,
    });

    revalidatePath('/admin/roles');

    return {
      success: true,
      data: role,
    };
  } catch (error) {
    console.error('Error creating role:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to create role',
    };
  }
}

export async function updateRole(data: {
  id: string;
  name?: string;
  description?: string;
  permissions?: PermissionsObject;
}) {
  try {
    const currentUser = await getCurrentUser();

    if (!currentUser?.isPlatformAdmin) {
      return {
        success: false,
        error: 'Unauthorized: Only platform administrators can update roles',
      };
    }

    const { id, ...updateData } = data;

    const role = await db.role.update({
      where: { id },
      data: updateData,
    });

    // Log the activity
    await createActivityLog({
      userId: currentUser.id,
      action: 'UPDATE',
      entityType: 'role',
      entityId: role.id,
      entityName: role.name,
      description: `Updated platform role "${role.name}"`,
      metadata: { roleId: role.id, updatedFields: Object.keys(updateData) },
      bakeryId: currentUser.bakeryId,
    });

    revalidatePath('/admin/roles');

    return {
      success: true,
      data: role,
    };
  } catch (error) {
    console.error('Error updating role:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to update role',
    };
  }
}

export async function deleteRole(id: string) {
  try {
    const currentUser = await getCurrentUser();

    if (!currentUser?.isPlatformAdmin) {
      return {
        success: false,
        error: 'Unauthorized: Only platform administrators can delete roles',
      };
    }

    // Check if role has users
    const role = await db.role.findUnique({
      where: { id },
      include: {
        _count: {
          select: { users: true },
        },
      },
    });

    if (!role) {
      return {
        success: false,
        error: 'Role not found',
      };
    }

    if (role._count.users > 0) {
      return {
        success: false,
        error: `Cannot delete role with ${role._count.users} assigned user(s). Please reassign users first.`,
      };
    }

    await db.role.delete({
      where: { id },
    });

    // Log the activity
    await createActivityLog({
      userId: currentUser.id,
      action: 'DELETE',
      entityType: 'role',
      entityId: role.id,
      entityName: role.name,
      description: `Deleted platform role "${role.name}"`,
      metadata: { roleId: role.id },
      bakeryId: currentUser.bakeryId,
    });

    revalidatePath('/admin/roles');

    return {
      success: true,
    };
  } catch (error) {
    console.error('Error deleting role:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to delete role',
    };
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
