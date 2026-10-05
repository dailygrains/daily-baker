import { serviceHandler } from '@/lib/api/service-handler';
import { assignVendorToIngredient } from '@/lib/services/ingredient';

/** POST /api/v1/ingredients/:id/vendors { vendorId }: link a vendor. */
export const POST = serviceHandler('write', 'POST /ingredients/:id/vendors', (ctx, { params, body }) =>
  assignVendorToIngredient(ctx, params.id, body)
);
