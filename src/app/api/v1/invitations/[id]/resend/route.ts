import { serviceHandler } from '@/lib/api/service-handler';
import { resendInvitation } from '@/lib/services/invitation';

/** POST /api/v1/invitations/:id/resend: extend a pending invitation and email it again (platform admin). */
export const POST = serviceHandler('write', 'POST /invitations/:id/resend', (ctx, { params }) =>
  resendInvitation(ctx, params.id)
);
