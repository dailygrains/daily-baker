import { createCrudRoutes } from '@/lib/api/create-crud-routes';
import { createSupplySchema, updateSupplySchema } from '@/lib/validations/supply';

const routes = createCrudRoutes({
  model: 'supply',
  bakeryScoped: true,
  searchFields: ['name', 'sku'],
  allowedIncludes: ['vendors'],
  validators: { create: createSupplySchema, update: updateSupplySchema },
});

export const { GET, POST } = routes.collection;
