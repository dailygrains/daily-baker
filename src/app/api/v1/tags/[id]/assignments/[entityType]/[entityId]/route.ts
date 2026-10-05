import { serviceHandler } from '@/lib/api/service-handler';
import { unassignTag } from '@/lib/services/tag';

/** DELETE /api/v1/tags/:id/assignments/:entityType/:entityId: remove the assignment. */
export const DELETE = serviceHandler(
  'write',
  'DELETE /tags/:id/assignments/:entityType/:entityId',
  (ctx, { params }) =>
    unassignTag(ctx, params.id, { entityType: params.entityType, entityId: params.entityId })
);
