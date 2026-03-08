import { createCrudRoutes } from '@/lib/api/create-crud-routes';
import { createBakerySchema, updateBakerySchema } from '@/lib/validations/bakery';

const routes = createCrudRoutes({
  model: 'bakery',
  bakeryScoped: false,
  adminOnly: true,
  searchFields: ['name'],
  validators: { create: createBakerySchema, update: updateBakerySchema },
});

export const { GET, PUT, DELETE } = routes.single;
