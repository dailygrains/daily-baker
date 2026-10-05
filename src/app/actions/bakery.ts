'use server';

import { db } from '@/lib/db';
import { getCurrentUser } from '@/lib/clerk';
import { revalidatePath } from 'next/cache';
import { actionContext, actionError, UNAUTHORIZED, type ActionResult } from '@/lib/services/action';
import * as bakeryService from '@/lib/services/bakery';
import * as userService from '@/lib/services/user';

type BakeryResult = ActionResult<Awaited<ReturnType<typeof bakeryService.createBakery>>>;
type UserResult = ActionResult<Awaited<ReturnType<typeof userService.assignUserToBakery>>>;

export async function createBakery(data: unknown): Promise<BakeryResult> {
  try {
    const ctx = await actionContext();
    if (!ctx) return UNAUTHORIZED;

    const bakery = await bakeryService.createBakery(ctx, data);

    revalidatePath('/admin/bakeries');
    return { success: true, data: bakery };
  } catch (error) {
    return actionError(error, 'Failed to create bakery');
  }
}

export async function updateBakery(data: unknown): Promise<BakeryResult> {
  try {
    const ctx = await actionContext();
    if (!ctx) return UNAUTHORIZED;

    const id = (data as { id?: unknown } | null)?.id;
    const bakery = await bakeryService.updateBakery(ctx, typeof id === 'string' ? id : '', data);

    revalidatePath('/admin/bakeries');
    revalidatePath(`/admin/bakeries/${bakery.id}`);
    return { success: true, data: bakery };
  } catch (error) {
    return actionError(error, 'Failed to update bakery');
  }
}

export async function deleteBakery(id: string): Promise<ActionResult> {
  try {
    const ctx = await actionContext();
    if (!ctx) return UNAUTHORIZED;

    await bakeryService.deleteBakery(ctx, id);

    revalidatePath('/admin/bakeries');
    return { success: true };
  } catch (error) {
    return actionError(error, 'Failed to delete bakery');
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

function revalidateAssignment(userId: string, bakeryId: string) {
  revalidatePath('/admin/bakeries');
  revalidatePath(`/admin/bakeries/${bakeryId}`);
  revalidatePath(`/admin/bakeries/${bakeryId}/edit`);
  revalidatePath('/admin/users');
  revalidatePath(`/admin/users/${userId}`);
}

/** Same service as the user actions' version; both revalidate both views. */
export async function assignUserToBakery(userId: string, bakeryId: string): Promise<UserResult> {
  try {
    const ctx = await actionContext();
    if (!ctx) return UNAUTHORIZED;

    const user = await userService.assignUserToBakery(ctx, userId, bakeryId);

    revalidateAssignment(userId, bakeryId);
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

    revalidateAssignment(userId, bakeryId);
    return { success: true, data: user };
  } catch (error) {
    return actionError(error, 'Failed to unassign user from bakery');
  }
}
