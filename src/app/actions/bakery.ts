'use server';

import { db } from '@/lib/db';
import { getCurrentUser } from '@/lib/clerk';
import { createBakerySchema, updateBakerySchema } from '@/lib/validations/bakery';
import { revalidatePath } from 'next/cache';
import { createActivityLog } from './activity-log';

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

export async function createBakery(data: unknown) {
  try {
    const user = await getCurrentUser();

    // Only platform admins can create bakeries
    if (!user?.isPlatformAdmin) {
      return {
        success: false,
        error: 'Unauthorized: Only platform administrators can create bakeries',
      };
    }

    const validatedData = createBakerySchema.parse(data);

    // Generate slug from bakery name
    const slug = generateSlug(validatedData.name);

    // Check if slug already exists and append number if needed
    let slugSuffix = 1;
    let finalSlug = slug;
    while (await db.bakery.findUnique({ where: { slug: finalSlug } })) {
      finalSlug = `${slug}-${slugSuffix}`;
      slugSuffix++;
    }

    const bakery = await db.bakery.create({
      data: {
        ...validatedData,
        slug: finalSlug,
      },
    });

    // Log the activity
    await createActivityLog({
      userId: user.id,
      action: 'CREATE',
      entityType: 'bakery',
      entityId: bakery.id,
      entityName: bakery.name,
      description: `Created bakery "${bakery.name}"`,
      metadata: { bakeryId: bakery.id },
    });

    revalidatePath('/admin/bakeries');

    return {
      success: true,
      data: bakery,
    };
  } catch (error) {
    console.error('Error creating bakery:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to create bakery',
    };
  }
}

export async function updateBakery(data: unknown) {
  try {
    const user = await getCurrentUser();

    if (!user?.isPlatformAdmin) {
      return {
        success: false,
        error: 'Unauthorized: Only platform administrators can update bakeries',
      };
    }

    const validatedData = updateBakerySchema.parse(data);
    const { id, ...updateData } = validatedData;

    const bakery = await db.bakery.update({
      where: { id },
      data: updateData,
    });

    // Log the activity
    await createActivityLog({
      userId: user.id,
      action: 'UPDATE',
      entityType: 'bakery',
      entityId: bakery.id,
      entityName: bakery.name,
      description: `Updated bakery "${bakery.name}"`,
      metadata: { bakeryId: bakery.id, updatedFields: Object.keys(updateData) },
      bakeryId: bakery.id,
    });

    revalidatePath('/admin/bakeries');
    revalidatePath(`/admin/bakeries/${id}`);

    return {
      success: true,
      data: bakery,
    };
  } catch (error) {
    console.error('Error updating bakery:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to update bakery',
    };
  }
}

export async function deleteBakery(id: string) {
  try {
    const user = await getCurrentUser();

    if (!user?.isPlatformAdmin) {
      return {
        success: false,
        error: 'Unauthorized: Only platform administrators can delete bakeries',
      };
    }

    // Check if bakery has any users
    const bakery = await db.bakery.findUnique({
      where: { id },
      include: {
        _count: {
          select: { users: true },
        },
      },
    });

    if (!bakery) {
      return {
        success: false,
        error: 'Bakery not found',
      };
    }

    if (bakery._count.users > 0) {
      return {
        success: false,
        error: `Cannot delete bakery with ${bakery._count.users} active user(s). Please reassign or remove users first.`,
      };
    }

    await db.bakery.delete({
      where: { id },
    });

    // Log the activity
    await createActivityLog({
      userId: user.id,
      action: 'DELETE',
      entityType: 'bakery',
      entityId: bakery.id,
      entityName: bakery.name,
      description: `Deleted bakery "${bakery.name}"`,
      metadata: { bakeryId: bakery.id },
    });

    revalidatePath('/admin/bakeries');

    return {
      success: true,
    };
  } catch (error) {
    console.error('Error deleting bakery:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to delete bakery',
    };
  }
}

export async function getAllBakeries() {
  try {
    const user = await getCurrentUser();

    if (!user?.isPlatformAdmin) {
      return {
        success: false,
        error: 'Unauthorized: Only platform administrators can view all bakeries',
      };
    }

    const bakeries = await db.bakery.findMany({
      include: {
        _count: {
          select: {
            users: true,
            recipes: true,
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    return {
      success: true,
      data: bakeries,
    };
  } catch (error) {
    console.error('Error fetching bakeries:', error);
    return {
      success: false,
      error: 'Failed to fetch bakeries',
    };
  }
}

export async function getBakeryById(id: string) {
  try {
    const user = await getCurrentUser();

    if (!user?.isPlatformAdmin) {
      return {
        success: false,
        error: 'Unauthorized',
      };
    }

    const bakery = await db.bakery.findUnique({
      where: { id },
      include: {
        users: {
          include: {
            user: {
              select: {
                id: true,
                clerkId: true,
                name: true,
                email: true,
                role: true,
              },
            },
          },
        },
        _count: {
          select: {
            users: true,
          },
        },
      },
    });

    if (!bakery) {
      return {
        success: false,
        error: 'Bakery not found',
      };
    }

    // Transform the users array to flatten the UserBakery join table structure
    const transformedBakery = {
      ...bakery,
      users: bakery.users.map(ub => ub.user),
    };

    return {
      success: true,
      data: transformedBakery,
    };
  } catch (error) {
    console.error('Error fetching bakery:', error);
    return {
      success: false,
      error: 'Failed to fetch bakery',
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

    // Get user info
    const targetUser = await db.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        name: true,
        email: true,
      },
    });

    if (!targetUser) {
      return {
        success: false,
        error: 'User not found',
      };
    }

    // Get bakery info
    const bakery = await db.bakery.findUnique({
      where: { id: bakeryId },
      select: {
        id: true,
        name: true,
      },
    });

    if (!bakery) {
      return {
        success: false,
        error: 'Bakery not found',
      };
    }

    // Create bakery assignment using join table
    await db.userBakery.create({
      data: {
        userId,
        bakeryId,
      },
    });

    // Get updated user with bakeries
    const updatedUser = await db.user.findUnique({
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

    // Log the activity
    await createActivityLog({
      userId: currentUser.id,
      action: 'ASSIGN',
      entityType: 'user',
      entityId: targetUser.id,
      entityName: targetUser.name || targetUser.email,
      description: `Assigned ${targetUser.name || targetUser.email} to bakery "${bakery.name}"`,
      metadata: { userId: targetUser.id, bakeryId: bakery.id },
      bakeryId: bakery.id,
    });

    revalidatePath('/admin/bakeries');
    revalidatePath(`/admin/bakeries/${bakeryId}`);
    revalidatePath(`/admin/bakeries/${bakeryId}/edit`);

    return {
      success: true,
      data: updatedUser,
    };
  } catch (error) {
    console.error('Error assigning user to bakery:', error);

    // Simplify error message for users
    let errorMessage = 'Failed to assign user to bakery';
    if (error instanceof Error) {
      if (error.message.includes('Unique constraint')) {
        errorMessage = 'User is already assigned to this bakery';
      } else if (error.message.includes('Foreign key constraint')) {
        errorMessage = 'Invalid user or bakery';
      }
    }

    return {
      success: false,
      error: errorMessage,
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

    // Get user info
    const targetUser = await db.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        name: true,
        email: true,
      },
    });

    if (!targetUser) {
      return {
        success: false,
        error: 'User not found',
      };
    }

    // Get bakery info
    const bakery = await db.bakery.findUnique({
      where: { id: bakeryId },
      select: { name: true },
    });

    // Delete the bakery assignment from join table
    await db.userBakery.deleteMany({
      where: {
        userId,
        bakeryId,
      },
    });

    // Get updated user with bakeries
    const updatedUser = await db.user.findUnique({
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

    // Log the activity
    await createActivityLog({
      userId: currentUser.id,
      action: 'REVOKE',
      entityType: 'user',
      entityId: targetUser.id,
      entityName: targetUser.name || targetUser.email,
      description: `Unassigned ${targetUser.name || targetUser.email} from bakery ${bakery?.name ? `"${bakery.name}"` : ''}`,
      metadata: { userId: targetUser.id, previousBakeryId: bakeryId },
    });

    revalidatePath('/admin/bakeries');
    revalidatePath(`/admin/bakeries/${bakeryId}`);
    revalidatePath(`/admin/bakeries/${bakeryId}/edit`);

    return {
      success: true,
      data: updatedUser,
    };
  } catch (error) {
    console.error('Error unassigning user from bakery:', error);

    // Simplify error message for users
    let errorMessage = 'Failed to unassign user from bakery';
    if (error instanceof Error) {
      if (error.message.includes('not found')) {
        errorMessage = 'User is not assigned to this bakery';
      }
    }

    return {
      success: false,
      error: errorMessage,
    };
  }
}
