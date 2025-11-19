'use server';

import { db } from '@/lib/db';
import { getCurrentUser } from '@/lib/clerk';
import { revalidatePath } from 'next/cache';

type PermissionsObject = Record<string, boolean>;

export async function createRole(data: {
  bakeryId: string;
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
        bakeryId: data.bakeryId,
        name: data.name,
        description: data.description || null,
        permissions: data.permissions,
      },
    });

    revalidatePath(`/admin/bakeries/${data.bakeryId}/roles`);

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

    revalidatePath(`/admin/bakeries/${role.bakeryId}/roles`);

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

    revalidatePath(`/admin/bakeries/${role.bakeryId}/roles`);

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

export async function getRolesByBakery(bakeryId: string) {
  try {
    const currentUser = await getCurrentUser();

    if (!currentUser?.isPlatformAdmin) {
      return {
        success: false,
        error: 'Unauthorized',
      };
    }

    const roles = await db.role.findMany({
      where: { bakeryId },
      include: {
        _count: {
          select: { users: true },
        },
      },
      orderBy: {
        name: 'asc',
      },
    });

    return {
      success: true,
      data: roles,
    };
  } catch (error) {
    console.error('Error fetching roles:', error);
    return {
      success: false,
      error: 'Failed to fetch roles',
    };
  }
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
        bakery: true,
        users: {
          select: {
            id: true,
            name: true,
            email: true,
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
