'use server';

import { db } from '@/lib/db';
import { getCurrentUser } from '@/lib/clerk';
import { revalidatePath } from 'next/cache';
import { createActivityLog } from './activity-log';

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

export async function assignUserToBakery(userId: string, bakeryId: string) {
  try {
    const currentUser = await getCurrentUser();

    if (!currentUser?.isPlatformAdmin) {
      return {
        success: false,
        error: 'Unauthorized: Only platform administrators can assign users to bakeries',
      };
    }

    // Check if assignment already exists
    const existingAssignment = await db.userBakery.findUnique({
      where: {
        userId_bakeryId: {
          userId,
          bakeryId,
        },
      },
    });

    if (existingAssignment) {
      return {
        success: false,
        error: 'User is already assigned to this bakery',
      };
    }

    // Create the bakery assignment
    await db.userBakery.create({
      data: {
        userId,
        bakeryId,
      },
    });

    // Fetch updated user with bakery info
    const user = await db.user.findUnique({
      where: { id: userId },
      include: {
        bakeries: {
          include: {
            bakery: true,
          },
        },
        role: true,
      },
    });

    const bakery = await db.bakery.findUnique({
      where: { id: bakeryId },
    });

    // Log the activity
    await createActivityLog({
      userId: currentUser.id,
      action: 'ASSIGN',
      entityType: 'user',
      entityId: userId,
      entityName: user?.name || user?.email || '',
      description: `Assigned ${user?.name || user?.email} to bakery "${bakery?.name}"`,
      metadata: { userId, bakeryId },
      bakeryId,
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

export async function unassignUserFromBakery(userId: string, bakeryId: string) {
  try {
    const currentUser = await getCurrentUser();

    if (!currentUser?.isPlatformAdmin) {
      return {
        success: false,
        error: 'Unauthorized: Only platform administrators can unassign users from bakeries',
      };
    }

    // Delete the bakery assignment
    await db.userBakery.deleteMany({
      where: {
        userId,
        bakeryId,
      },
    });

    // Fetch updated user
    const user = await db.user.findUnique({
      where: { id: userId },
      include: {
        bakeries: {
          include: {
            bakery: true,
          },
        },
        role: true,
      },
    });

    const bakery = await db.bakery.findUnique({
      where: { id: bakeryId },
    });

    // Log the activity
    await createActivityLog({
      userId: currentUser.id,
      action: 'REVOKE',
      entityType: 'user',
      entityId: userId,
      entityName: user?.name || user?.email || '',
      description: `Unassigned ${user?.name || user?.email} from bakery "${bakery?.name}"`,
      metadata: { userId, bakeryId },
      bakeryId,
    });

    revalidatePath('/admin/users');
    revalidatePath(`/admin/users/${userId}`);

    return {
      success: true,
      data: user,
    };
  } catch (error) {
    console.error('Error unassigning user from bakery:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to unassign user from bakery',
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
        bakeries: {
          include: {
            bakery: true,
          },
        },
        role: true,
      },
    });

    // Get first assigned bakery for activity log (if any)
    const firstBakeryId = user.bakeries[0]?.bakeryId ?? null;

    // Log the activity
    await createActivityLog({
      userId: currentUser.id,
      action: 'ASSIGN',
      entityType: 'user',
      entityId: user.id,
      entityName: user.name || user.email,
      description: roleId
        ? `Assigned role "${user.role?.name}" to ${user.name || user.email}`
        : `Removed role from ${user.name || user.email}`,
      metadata: { userId: user.id, roleId },
      bakeryId: firstBakeryId,
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
        bakeries: {
          include: {
            bakery: true,
          },
        },
        role: true,
      },
    });

    // Get first assigned bakery for activity log (if any)
    const firstBakeryId = user.bakeries[0]?.bakeryId ?? null;

    // Log the activity
    await createActivityLog({
      userId: currentUser.id,
      action: 'UPDATE',
      entityType: 'user',
      entityId: user.id,
      entityName: user.name || user.email,
      description: `Updated user ${user.name || user.email}`,
      metadata: { userId: user.id, updatedFields: Object.keys(updateData) },
      bakeryId: firstBakeryId,
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

    // Get user info before deleting and check for constraints
    const user = await db.user.findUnique({
      where: { id },
      select: {
        id: true,
        name: true,
        email: true,
        bakeries: {
          select: {
            bakeryId: true,
          },
        },
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

    // Check for constraints
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

      return {
        success: false,
        error: `Cannot delete user because they have ${reasons.join(' and ')}. Please reassign or remove these items before deleting.`,
      };
    }

    await db.user.delete({
      where: { id },
    });

    // Get first assigned bakery for activity log (if any)
    const firstBakeryId = user.bakeries[0]?.bakeryId ?? null;

    // Log the activity
    await createActivityLog({
      userId: currentUser.id,
      action: 'DELETE',
      entityType: 'user',
      entityId: user.id,
      entityName: user.name || user.email,
      description: `Deleted user ${user.name || user.email}`,
      metadata: { userId: user.id },
      bakeryId: firstBakeryId,
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
