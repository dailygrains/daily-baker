import { serviceHandler } from '@/lib/api/service-handler';
import { listTagsForEntity } from '@/lib/services/tag';

/** GET /api/v1/entity-tags/:entityType/:entityId: the tags on an ingredient, recipe or vendor. */
export const GET = serviceHandler('read', 'GET /entity-tags/:entityType/:entityId', (ctx, { params }) =>
  listTagsForEntity(ctx, params.entityType, params.entityId)
);
