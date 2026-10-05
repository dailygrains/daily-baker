import { createCrudRoutes } from '@/lib/api/create-crud-routes';
import { createInvitationSchema } from '@/lib/validations/invitation';
import { createInvitation, deleteInvitation } from '@/lib/services/invitation';

/**
 * Platform-admin only, across all bakeries (as /admin/invitations). There is
 * no generic update: use POST /invitations/:id/revoke or /resend.
 */
export const invitationRoutes = createCrudRoutes({
  model: 'invitation',
  bakeryScoped: false,
  adminOnly: true,
  searchFields: ['email'],
  allowedIncludes: ['bakery', 'role', 'creator'],
  validators: { create: createInvitationSchema },
  service: { create: createInvitation, remove: deleteInvitation },
});
