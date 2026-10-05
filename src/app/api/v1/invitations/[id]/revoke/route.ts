import { serviceHandler } from '@/lib/api/service-handler';
import { revokeInvitation } from '@/lib/services/invitation';

/** POST /api/v1/invitations/:id/revoke (platform admin). */
export const POST = serviceHandler('write', 'POST /invitations/:id/revoke', (ctx, { params }) =>
  revokeInvitation(ctx, params.id)
);
