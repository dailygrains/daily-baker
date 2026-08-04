import { createCrudRoutes } from '@/lib/api/create-crud-routes';
import { createProductSchema, updateProductSchema } from '@/lib/validations/product';

const routes = createCrudRoutes({
  model: 'product',
  bakeryScoped: true,
  searchFields: ['name', 'sku'],
  allowedIncludes: ['recipe', 'productSupplies'],
  validators: { create: createProductSchema, update: updateProductSchema },
});

export const { GET, PUT, DELETE } = routes.single;
