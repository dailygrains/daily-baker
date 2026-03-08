import { createCrudRoutes } from '@/lib/api/create-crud-routes';
import { createVendorSchema, updateVendorSchema } from '@/lib/validations/vendor';

const routes = createCrudRoutes({
  model: 'vendor',
  bakeryScoped: true,
  searchFields: ['name', 'contactName'],
  allowedIncludes: ['contacts', 'ingredients'],
  validators: { create: createVendorSchema, update: updateVendorSchema },
});

export const { GET, POST } = routes.collection;
