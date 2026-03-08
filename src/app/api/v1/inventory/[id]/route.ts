import { createCrudRoutes } from '@/lib/api/create-crud-routes';

const routes = createCrudRoutes({
  model: 'inventory',
  bakeryScoped: true,
  searchFields: [],
  allowedIncludes: ['lots', 'ingredient'],
});

export const { GET, PUT, DELETE } = routes.single;
