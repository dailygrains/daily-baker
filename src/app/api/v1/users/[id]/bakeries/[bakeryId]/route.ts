import { serviceHandler } from '@/lib/api/service-handler';
import { assignUserToBakery, unassignUserFromBakery } from '@/lib/services/user';

/** POST /api/v1/users/:id/bakeries/:bakeryId: link a user to a bakery (platform admin). */
export const POST = serviceHandler('write', 'POST /users/:id/bakeries/:bakeryId', (ctx, { params }) =>
  assignUserToBakery(ctx, params.id, params.bakeryId)
);

/** DELETE /api/v1/users/:id/bakeries/:bakeryId: remove the link (platform admin). */
export const DELETE = serviceHandler('write', 'DELETE /users/:id/bakeries/:bakeryId', (ctx, { params }) =>
  unassignUserFromBakery(ctx, params.id, params.bakeryId)
);
