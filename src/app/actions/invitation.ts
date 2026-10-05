'use server';

import { db } from '@/lib/db';
import { getCurrentUser } from '@/lib/clerk';
import { revalidatePath } from 'next/cache';
import { actionContext, actionError, UNAUTHORIZED, type ActionResult } from '@/lib/services/action';
import * as invitationService from '@/lib/services/invitation';

type InvitationResult = ActionResult<Awaited<ReturnType<typeof invitationService.createInvitation>>>;

export async function createInvitation(data: {
  email: string;
  bakeryId?: string | null;
  roleId?: string | null;
}): Promise<InvitationResult> {
  try {
    const ctx = await actionContext();
    if (!ctx) return UNAUTHORIZED;

    const invitation = await invitationService.createInvitation(ctx, data);

    revalidatePath('/admin/invitations');
    return { success: true, data: invitation };
  } catch (error) {
    return actionError(error, 'Failed to create invitation');
  }
}

export async function getAllInvitations() {
  try {
    const currentUser = await getCurrentUser();

    if (!currentUser?.isPlatformAdmin) {
      return {
        success: false,
        error: 'Unauthorized',
      };
    }

    const invitations = await db.invitation.findMany({
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
        creator: {
          select: {
            name: true,
            email: true,
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    return {
      success: true,
      data: invitations,
    };
  } catch (error) {
    console.error('Error fetching invitations:', error);
    return {
      success: false,
      error: 'Failed to fetch invitations',
    };
  }
}

export async function revokeInvitation(id: string): Promise<ActionResult> {
  try {
    const ctx = await actionContext();
    if (!ctx) return UNAUTHORIZED;

    await invitationService.revokeInvitation(ctx, id);

    revalidatePath('/admin/invitations');
    return { success: true };
  } catch (error) {
    return actionError(error, 'Failed to revoke invitation');
  }
}

export async function deleteInvitation(id: string): Promise<ActionResult> {
  try {
    const ctx = await actionContext();
    if (!ctx) return UNAUTHORIZED;

    await invitationService.deleteInvitation(ctx, id);

    revalidatePath('/admin/invitations');
    return { success: true };
  } catch (error) {
    return actionError(error, 'Failed to delete invitation');
  }
}

export async function getInvitationByEmail(email: string) {
  try {
    const invitation = await db.invitation.findFirst({
      where: {
        email,
        status: 'PENDING',
        expiresAt: {
          gte: new Date(),
        },
      },
      include: {
        bakery: true,
        role: true,
      },
    });

    return {
      success: true,
      data: invitation,
    };
  } catch (error) {
    console.error('Error fetching invitation:', error);
    return {
      success: false,
      error: 'Failed to fetch invitation',
    };
  }
}

export async function acceptInvitation(email: string) {
  try {
    const invitation = await db.invitation.findFirst({
      where: {
        email,
        status: 'PENDING',
        expiresAt: {
          gte: new Date(),
        },
      },
    });

    if (!invitation) {
      return {
        success: false,
        error: 'No valid invitation found',
      };
    }

    // Mark invitation as accepted
    await db.invitation.update({
      where: { id: invitation.id },
      data: {
        status: 'ACCEPTED',
        acceptedAt: new Date(),
      },
    });

    return {
      success: true,
      data: {
        bakeryId: invitation.bakeryId,
        roleId: invitation.roleId,
      },
    };
  } catch (error) {
    console.error('Error accepting invitation:', error);
    return {
      success: false,
      error: 'Failed to accept invitation',
    };
  }
}

export async function resendInvitation(id: string): Promise<ActionResult> {
  try {
    const ctx = await actionContext();
    if (!ctx) return UNAUTHORIZED;

    await invitationService.resendInvitation(ctx, id);

    revalidatePath('/admin/invitations');
    return { success: true };
  } catch (error) {
    return actionError(error, 'Failed to resend invitation');
  }
}
