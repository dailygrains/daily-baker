import { createCrudRoutes } from '@/lib/api/create-crud-routes';
import { createVendorSchema, updateVendorSchema } from '@/lib/validations/vendor';
import { createVendor, updateVendor, deleteVendor } from '@/lib/services/vendor';

export const vendorRoutes = createCrudRoutes({
  model: 'vendor',
  bakeryScoped: true,
  searchFields: ['name', 'email'],
  allowedIncludes: [
    'contacts',
    'ingredients',
    'ingredients.ingredient',
    'equipment',
    'supplies',
    'supplies.supply',
  ],
  validators: { create: createVendorSchema, update: updateVendorSchema },
  service: { create: createVendor, update: updateVendor, remove: deleteVendor },
});
