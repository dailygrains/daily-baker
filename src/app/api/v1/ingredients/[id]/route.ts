import { createCrudRoutes } from '@/lib/api/create-crud-routes';
import { createIngredientSchema, updateIngredientSchema } from '@/lib/validations/ingredient';

const routes = createCrudRoutes({
  model: 'ingredient',
  bakeryScoped: true,
  searchFields: ['name'],
  allowedIncludes: ['vendor', 'inventory'],
  validators: { create: createIngredientSchema, update: updateIngredientSchema },
});

export const { GET, PUT, DELETE } = routes.single;
