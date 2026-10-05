import { serviceHandler } from '@/lib/api/service-handler';
import { recalculateProductCost } from '@/lib/services/product';

/** POST /api/v1/products/:id/recalculate: reprice every variation. */
export const POST = serviceHandler('write', 'POST /products/:id/recalculate', async (ctx, { params }) => {
  const { product, warnings } = await recalculateProductCost(ctx, params.id);
  return { ...product, warnings };
});
