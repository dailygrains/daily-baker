import { createCrudRoutes } from '@/lib/api/create-crud-routes';
import { createProductionSheetSchema, updateProductionSheetSchema } from '@/lib/validations/productionSheet';

const routes = createCrudRoutes({
  model: 'productionSheet',
  bakeryScoped: true,
  searchFields: ['name'],
  allowedIncludes: ['recipes'],
  validators: { create: createProductionSheetSchema, update: updateProductionSheetSchema },
});

export const { GET, POST } = routes.collection;
