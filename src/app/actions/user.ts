'use server';

import { db } from '@/lib/db';
import { getCurrentUser } from '@/lib/clerk';
import { revalidatePath } from 'next/cache';

export async function getAllUsers() {
  try {
    const user = await getCurrentUser();

    if (!user?.isPlatformAdmin) {
      return {
        success: false,
        error: 'Unauthorized: Only platform administrators can view all users',
      };
    }

    const users = await db.user.findMany({
      include: {
        bakery: {
          select: {
            id: true,
            name: true,
          },
        },
        role: {
          select: {
            id: true,
            name: true,
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    return {
      success: true,
      data: users,
    };
  } catch (error) {
    console.error('Error fetching users:', error);
    return {
      success: false,
      error: 'Failed to fetch users',
    };
  }
}

export async function getUserById(id: string) {
  try {
    const currentUser = await getCurrentUser();

    if (!currentUser?.isPlatformAdmin) {
      return {
        success: false,
        error: 'Unauthorized',
      };
    }

    const user = await db.user.findUnique({
      where: { id },
      include: {
        bakery: true,
        role: true,
      },
    });

    if (!user) {
      return {
        success: false,
        error: 'User not found',
      };
    }

    return {
      success: true,
      data: user,
    };
  } catch (error) {
    console.error('Error fetching user:', error);
    return {
      success: false,
      error: 'Failed to fetch user',
    };
  }
}

export async function assignUserToBakery(userId: string, bakeryId: string | null) {
  try {
    const currentUser = await getCurrentUser();

    if (!currentUser?.isPlatformAdmin) {
      return {
        success: false,
        error: 'Unauthorized: Only platform administrators can assign users to bakeries',
      };
    }

    const user = await db.user.update({
      where: { id: userId },
      data: {
        bakeryId: bakeryId,
      },
      include: {
        bakery: true,
        role: true,
      },
    });

    revalidatePath('/admin/users');
    revalidatePath(`/admin/users/${userId}`);

    return {
      success: true,
      data: user,
    };
  } catch (error) {
    console.error('Error assigning user to bakery:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to assign user to bakery',
    };
  }
}

export async function assignUserRole(userId: string, roleId: string | null) {
  try {
    const currentUser = await getCurrentUser();

    if (!currentUser?.isPlatformAdmin) {
      return {
        success: false,
        error: 'Unauthorized: Only platform administrators can assign roles',
      };
    }

    const user = await db.user.update({
      where: { id: userId },
      data: {
        roleId: roleId,
      },
      include: {
        bakery: true,
        role: true,
      },
    });

    revalidatePath('/admin/users');
    revalidatePath(`/admin/users/${userId}`);

    return {
      success: true,
      data: user,
    };
  } catch (error) {
    console.error('Error assigning role:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to assign role',
    };
  }
}

export async function updateUser(data: {
  id: string;
  bakeryId?: string | null;
  roleId?: string | null;
  name?: string;
}) {
  try {
    const currentUser = await getCurrentUser();

    if (!currentUser?.isPlatformAdmin) {
      return {
        success: false,
        error: 'Unauthorized: Only platform administrators can update users',
      };
    }

    const { id, ...updateData } = data;

    const user = await db.user.update({
      where: { id },
      data: updateData,
      include: {
        bakery: true,
        role: true,
      },
    });

    revalidatePath('/admin/users');
    revalidatePath(`/admin/users/${id}`);

    return {
      success: true,
      data: user,
    };
  } catch (error) {
    console.error('Error updating user:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to update user',
    };
  }
}

export async function deleteUser(id: string) {
  try {
    const currentUser = await getCurrentUser();

    if (!currentUser?.isPlatformAdmin) {
      return {
        success: false,
        error: 'Unauthorized: Only platform administrators can delete users',
      };
    }

    await db.user.delete({
      where: { id },
    });

    revalidatePath('/admin/users');

    return {
      success: true,
    };
  } catch (error) {
    console.error('Error deleting user:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to delete user',
    };
  }
}

export async function getAllRoles() {
  try {
    const currentUser = await getCurrentUser();

    if (!currentUser?.isPlatformAdmin) {
      return {
        success: false,
        error: 'Unauthorized',
      };
    }

    const roles = await db.role.findMany({
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
