import { randomBytes } from 'crypto';
import { db } from '@/lib/db';
import { sendUserInvitation } from '@/lib/ses';
import { createInvitationSchema } from '@/lib/validations/invitation';
import { ServiceError, logActivity, notFound, type ServiceContext } from './context';
import { requireAdmin } from './admin';

const INVITATION_TTL_DAYS = 7;

function expiryFromNow() {
  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + INVITATION_TTL_DAYS);
  return expiresAt;
}

/** Email the sign-up link. A send failure is logged, never fatal. */
async function sendInviteEmail(email: string, token: string, bakeryName: string | undefined) {
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://baker.dailygrains.co';
  try {
    await sendUserInvitation({
      toEmail: email,
      toName: email.split('@')[0],
      bakeryName: bakeryName || 'Daily Baker',
      inviteUrl: `${appUrl}/sign-up?token=${token}`,
    });
  } catch (emailError) {
    console.error('Failed to send invitation email:', emailError);
  }
}

async function findInvitation(id: string) {
  const invitation = await db.invitation.findUnique({ where: { id } });
  if (!invitation) throw notFound('Invitation');
  return invitation;
}

/**
 * Invite someone by email. The server generates the token and expiry,
 * records the inviting user and sends the email. Invitation.createdBy must
 * be a user, so callers without one (API keys) cannot invite yet.
 */
export async function createInvitation(ctx: ServiceContext, input: unknown) {
  requireAdmin(ctx, 'create invitations');
  if (!ctx.userId) {
    throw new ServiceError(
      422,
      'Creating invitations requires a signed-in user; API keys are not tied to a user'
    );
  }
  const data = createInvitationSchema.parse(input);

  if (data.bakeryId) {
    const bakery = await db.bakery.findUnique({ where: { id: data.bakeryId }, select: { id: true } });
    if (!bakery) throw new ServiceError(422, 'Bakery not found');
  }
  if (data.roleId) {
    const role = await db.role.findUnique({ where: { id: data.roleId }, select: { id: true } });
    if (!role) throw new ServiceError(422, 'Role not found');
  }

  if (await db.user.findFirst({ where: { email: data.email } })) {
    throw new ServiceError(409, 'A user with this email already exists');
  }
  if (await db.invitation.findFirst({ where: { email: data.email, status: 'PENDING' } })) {
    throw new ServiceError(409, 'An invitation for this email is already pending');
  }

  const token = randomBytes(32).toString('hex');

  const invitation = await db.invitation.create({
    data: {
      email: data.email,
      bakeryId: data.bakeryId || null,
      roleId: data.roleId || null,
      token,
      expiresAt: expiryFromNow(),
      createdBy: ctx.userId,
    },
    include: {
      bakery: true,
      role: true,
      creator: { select: { name: true, email: true } },
    },
  });

  await logActivity(ctx, {
    action: 'INVITE',
    entityType: 'invitation',
    entityId: invitation.id,
    entityName: invitation.email,
    description: invitation.bakery
      ? `Invited ${invitation.email} to bakery "${invitation.bakery.name}"`
      : `Invited ${invitation.email} to platform`,
    metadata: {
      invitationId: invitation.id,
      email: invitation.email,
      bakeryId: invitation.bakeryId,
      roleId: invitation.roleId,
    },
    bakeryId: invitation.bakeryId,
  });

  await sendInviteEmail(invitation.email, token, invitation.bakery?.name);

  return invitation;
}

export async function revokeInvitation(ctx: ServiceContext, id: string) {
  requireAdmin(ctx, 'revoke invitations');
  await findInvitation(id);

  const invitation = await db.invitation.update({
    where: { id },
    data: { status: 'REVOKED' },
    include: { bakery: true },
  });

  await logActivity(ctx, {
    action: 'REVOKE',
    entityType: 'invitation',
    entityId: invitation.id,
    entityName: invitation.email,
    description: `Revoked invitation for ${invitation.email}`,
    metadata: { invitationId: invitation.id, email: invitation.email },
    bakeryId: invitation.bakeryId,
  });

  return invitation;
}

export async function deleteInvitation(ctx: ServiceContext, id: string) {
  requireAdmin(ctx, 'delete invitations');
  const invitation = await findInvitation(id);

  await db.invitation.delete({ where: { id } });

  await logActivity(ctx, {
    action: 'DELETE',
    entityType: 'invitation',
    entityId: id,
    entityName: invitation.email,
    description: `Deleted invitation for ${invitation.email}`,
    metadata: { email: invitation.email },
    bakeryId: invitation.bakeryId,
  });

  return invitation;
}

/** Extend a pending invitation by another week and email it again. */
export async function resendInvitation(ctx: ServiceContext, id: string) {
  requireAdmin(ctx, 'resend invitations');
  const invitation = await findInvitation(id);
  if (invitation.status !== 'PENDING') {
    throw new ServiceError(409, 'Can only resend pending invitations');
  }

  const updated = await db.invitation.update({
    where: { id },
    data: { expiresAt: expiryFromNow() },
    include: { bakery: true, role: true },
  });

  await sendInviteEmail(updated.email, updated.token, updated.bakery?.name);

  return updated;
}
