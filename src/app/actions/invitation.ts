'use server';

import { db } from '@/lib/db';
import { getCurrentUser } from '@/lib/clerk';
import { revalidatePath } from 'next/cache';
import { randomBytes } from 'crypto';

export async function createInvitation(data: {
  email: string;
  bakeryId?: string | null;
  roleId?: string | null;
}) {
  try {
    const currentUser = await getCurrentUser();

    if (!currentUser?.isPlatformAdmin) {
      return {
        success: false,
        error: 'Unauthorized: Only platform administrators can create invitations',
      };
    }

    // Check if user already exists
    const existingUser = await db.user.findFirst({
      where: { email: data.email },
    });

    if (existingUser) {
      return {
        success: false,
        error: 'A user with this email already exists',
      };
    }

    // Check if there's already a pending invitation
    const existingInvitation = await db.invitation.findFirst({
      where: {
        email: data.email,
        status: 'PENDING',
      },
    });

    if (existingInvitation) {
      return {
        success: false,
        error: 'An invitation for this email is already pending',
      };
    }

    // Generate unique token
    const token = randomBytes(32).toString('hex');

    // Set expiry to 7 days from now
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7);

    const invitation = await db.invitation.create({
      data: {
        email: data.email,
        bakeryId: data.bakeryId || null,
        roleId: data.roleId || null,
        token,
        expiresAt,
        createdBy: currentUser.id,
      },
      include: {
        bakery: true,
        role: true,
        creator: {
          select: {
            name: true,
            email: true,
          },
        },
      },
    });

    revalidatePath('/admin/invitations');

    return {
      success: true,
      data: invitation,
    };
  } catch (error) {
    console.error('Error creating invitation:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to create invitation',
    };
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

export async function revokeInvitation(id: string) {
  try {
    const currentUser = await getCurrentUser();

    if (!currentUser?.isPlatformAdmin) {
      return {
        success: false,
        error: 'Unauthorized',
      };
    }

    const invitation = await db.invitation.update({
      where: { id },
      data: {
        status: 'REVOKED',
      },
    });

    revalidatePath('/admin/invitations');

    return {
      success: true,
      data: invitation,
    };
  } catch (error) {
    console.error('Error revoking invitation:', error);
    return {
      success: false,
      error: 'Failed to revoke invitation',
    };
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

export async function resendInvitation(id: string) {
  try {
    const currentUser = await getCurrentUser();

    if (!currentUser?.isPlatformAdmin) {
      return {
        success: false,
        error: 'Unauthorized',
      };
    }

    const invitation = await db.invitation.findUnique({
      where: { id },
    });

    if (!invitation) {
      return {
        success: false,
        error: 'Invitation not found',
      };
    }

    if (invitation.status !== 'PENDING') {
      return {
        success: false,
        error: 'Can only resend pending invitations',
      };
    }

    // Extend expiry by 7 days
    const newExpiresAt = new Date();
    newExpiresAt.setDate(newExpiresAt.getDate() + 7);

    const updatedInvitation = await db.invitation.update({
      where: { id },
      data: {
        expiresAt: newExpiresAt,
      },
      include: {
        bakery: true,
        role: true,
      },
    });

    revalidatePath('/admin/invitations');

    return {
      success: true,
      data: updatedInvitation,
    };
  } catch (error) {
    console.error('Error resending invitation:', error);
    return {
      success: false,
      error: 'Failed to resend invitation',
    };
  }
}
