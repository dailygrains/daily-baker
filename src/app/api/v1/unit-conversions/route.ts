import { createCrudRoutes } from '@/lib/api/create-crud-routes';
import { createUnitConversionSchema, updateUnitConversionSchema } from '@/lib/validations/unitConversion';

const routes = createCrudRoutes({
  model: 'unitConversion',
  bakeryScoped: true,
  searchFields: [],
  validators: { create: createUnitConversionSchema, update: updateUnitConversionSchema },
});

export const { GET, POST } = routes.collection;
