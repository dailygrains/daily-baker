import { serviceHandler } from '@/lib/api/service-handler';
import { unassignVendorFromIngredient } from '@/lib/services/ingredient';

/** DELETE /api/v1/ingredients/:id/vendors/:vendorId: unlink a vendor. */
export const DELETE = serviceHandler(
  'write',
  'DELETE /ingredients/:id/vendors/:vendorId',
  async (ctx, { params }) => {
    await unassignVendorFromIngredient(ctx, params.id, params.vendorId);
    return { deleted: true };
  }
);
