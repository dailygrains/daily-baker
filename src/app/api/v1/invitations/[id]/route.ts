import { invitationRoutes } from '@/lib/api/resources/invitations';

// No PUT: invitations change only through /revoke and /resend.
export const { GET, DELETE } = invitationRoutes.single;
