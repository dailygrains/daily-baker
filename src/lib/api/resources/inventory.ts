import { NextRequest } from 'next/server';
import { db } from '@/lib/db';
import { createCrudRoutes } from '@/lib/api/create-crud-routes';
import { resolveApiAuth, hasScope } from '@/lib/api/auth';
import { parsePagination, paginationMeta } from '@/lib/api/pagination';
import { serviceHandler } from '@/lib/api/service-handler';
import { apiSuccess, apiError, api401, api403, api404 } from '@/lib/api/responses';
import { updateInventorySettingsSchema } from '@/lib/validations/inventory';
import {
  addInventoryLot,
  deleteInventoryLot,
  lotInclude,
  updateInventoryLot,
  updateInventorySettings,
} from '@/lib/services/inventory';

/**
 * Inventory rows are read-only apart from their settings (lowStockThreshold).
 * They are created with an ingredient's first lot and deleted with the
 * ingredient, so the route files export only GET and PUT: POST and DELETE get
 * Next's 405.
 */
export const inventoryRoutes = createCrudRoutes({
  model: 'inventory',
  bakeryScoped: true,
  searchFields: [],
  allowedIncludes: ['lots', 'lots.vendor', 'ingredient'],
  validators: { update: updateInventorySettingsSchema },
  service: { update: updateInventorySettings },
});

// Inventory lots have no bakeryId column (they are scoped through their
// Inventory), so the reads are hand-written and the writes use the service.

type Params = { params: Promise<{ id: string }> };

async function readAuth(req: NextRequest) {
  const auth = await resolveApiAuth(req);
  if (!auth) return { error: api401() };
  if (!hasScope(auth, 'read')) return { error: api403('Insufficient scope') };
  if (!auth.bakeryId) return { error: api403('No bakery is associated with this account') };
  return { bakeryId: auth.bakeryId };
}

export const inventoryLotRoutes = {
  collection: {
    GET: async (req: NextRequest) => {
      try {
        const auth = await readAuth(req);
        if ('error' in auth) return auth.error;

        const pagination = parsePagination(req);
        const where = { inventory: { bakeryId: auth.bakeryId } };

        const [data, total] = await Promise.all([
          db.inventoryLot.findMany({
            where,
            include: lotInclude,
            skip: pagination.skip,
            take: pagination.limit,
            orderBy: { [pagination.sort]: pagination.order },
          }),
          db.inventoryLot.count({ where }),
        ]);

        return apiSuccess(data, paginationMeta(pagination.page, pagination.limit, total));
      } catch (error) {
        console.error('API GET /inventory-lots error:', error);
        return apiError('Internal server error', 500);
      }
    },
    POST: serviceHandler('write', 'POST /inventory-lots', (ctx, { body }) => addInventoryLot(ctx, body)),
  },
  single: {
    GET: async (req: NextRequest, { params }: Params) => {
      try {
        const auth = await readAuth(req);
        if ('error' in auth) return auth.error;

        const { id } = await params;
        const lot = await db.inventoryLot.findFirst({
          where: { id, inventory: { bakeryId: auth.bakeryId } },
          include: lotInclude,
        });
        if (!lot) return api404('Inventory lot');

        return apiSuccess(lot);
      } catch (error) {
        console.error('API GET /inventory-lots/:id error:', error);
        return apiError('Internal server error', 500);
      }
    },
    PUT: serviceHandler('write', 'PUT /inventory-lots/:id', (ctx, { params, body }) =>
      updateInventoryLot(ctx, params.id, body)
    ),
    DELETE: serviceHandler('write', 'DELETE /inventory-lots/:id', async (ctx, { params }) => {
      await deleteInventoryLot(ctx, params.id);
      return { deleted: true };
    }),
  },
};
