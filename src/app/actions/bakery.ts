'use server';

import { db } from '@/lib/db';
import { getCurrentUser } from '@/lib/clerk';
import { createBakerySchema, updateBakerySchema } from '@/lib/validations/bakery';
import { revalidatePath } from 'next/cache';
import { createActivityLog } from './activity-log';

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

    const bakery = await db.bakery.create({
      data: validatedData,
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
          select: {
            id: true,
            clerkId: true,
            name: true,
            email: true,
            role: true,
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

    return {
      success: true,
      data: bakery,
    };
  } catch (error) {
    console.error('Error fetching bakery:', error);
    return {
      success: false,
      error: 'Failed to fetch bakery',
    };
  }
}
