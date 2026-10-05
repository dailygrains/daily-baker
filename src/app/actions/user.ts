'use server';

import { db } from '@/lib/db';
import { getCurrentUser } from '@/lib/clerk';
import { revalidatePath } from 'next/cache';
import { actionContext, actionError, UNAUTHORIZED, type ActionResult } from '@/lib/services/action';
import * as userService from '@/lib/services/user';

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
        bakeries: {
          select: {
            bakery: {
              select: {
                id: true,
                name: true,
              },
            },
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
        bakeries: {
          include: {
            bakery: true,
          },
        },
        role: true,
        _count: {
          select: {
            inventoryUsages: true,
            sentInvitations: true,
          },
        },
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

type UserResult = ActionResult<Awaited<ReturnType<typeof userService.updateUser>>>;

function revalidateUser(userId: string) {
  revalidatePath('/admin/users');
  revalidatePath(`/admin/users/${userId}`);
}

/** Same service as the bakery actions' version; both revalidate both views. */
export async function assignUserToBakery(userId: string, bakeryId: string): Promise<UserResult> {
  try {
    const ctx = await actionContext();
    if (!ctx) return UNAUTHORIZED;

    const user = await userService.assignUserToBakery(ctx, userId, bakeryId);

    revalidateUser(userId);
    revalidatePath('/admin/bakeries');
    revalidatePath(`/admin/bakeries/${bakeryId}`);
    revalidatePath(`/admin/bakeries/${bakeryId}/edit`);
    return { success: true, data: user };
  } catch (error) {
    return actionError(error, 'Failed to assign user to bakery');
  }
}

export async function unassignUserFromBakery(userId: string, bakeryId: string): Promise<UserResult> {
  try {
    const ctx = await actionContext();
    if (!ctx) return UNAUTHORIZED;

    const user = await userService.unassignUserFromBakery(ctx, userId, bakeryId);

    revalidateUser(userId);
    revalidatePath('/admin/bakeries');
    revalidatePath(`/admin/bakeries/${bakeryId}`);
    revalidatePath(`/admin/bakeries/${bakeryId}/edit`);
    return { success: true, data: user };
  } catch (error) {
    return actionError(error, 'Failed to unassign user from bakery');
  }
}

export async function assignUserRole(userId: string, roleId: string | null): Promise<UserResult> {
  try {
    const ctx = await actionContext();
    if (!ctx) return UNAUTHORIZED;

    const user = await userService.assignUserRole(ctx, userId, roleId);

    revalidateUser(userId);
    return { success: true, data: user };
  } catch (error) {
    return actionError(error, 'Failed to assign role');
  }
}

export async function updateUser(data: {
  id: string;
  roleId?: string | null;
  name?: string;
}): Promise<UserResult> {
  try {
    const ctx = await actionContext();
    if (!ctx) return UNAUTHORIZED;

    const user = await userService.updateUser(ctx, data.id, data);

    revalidateUser(data.id);
    return { success: true, data: user };
  } catch (error) {
    return actionError(error, 'Failed to update user');
  }
}

export async function deleteUser(id: string): Promise<ActionResult> {
  try {
    const ctx = await actionContext();
    if (!ctx) return UNAUTHORIZED;

    await userService.deleteUser(ctx, id);

    revalidatePath('/admin/users');
    return { success: true };
  } catch (error) {
    return actionError(error, 'Failed to delete user');
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
