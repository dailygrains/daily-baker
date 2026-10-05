import { serviceHandler } from '@/lib/api/service-handler';
import { assignTag, listTagAssignments } from '@/lib/services/tag';

/** GET /api/v1/tags/:id/assignments: every entity this tag is assigned to. */
export const GET = serviceHandler('read', 'GET /tags/:id/assignments', (ctx, { params }) =>
  listTagAssignments(ctx, params.id)
);

/** POST /api/v1/tags/:id/assignments {entityType, entityId}: assign the tag. */
export const POST = serviceHandler('write', 'POST /tags/:id/assignments', (ctx, { params, body }) =>
  assignTag(ctx, params.id, body)
);
