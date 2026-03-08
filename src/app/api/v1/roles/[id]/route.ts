import { createCrudRoutes } from '@/lib/api/create-crud-routes';

const routes = createCrudRoutes({
  model: 'role',
  bakeryScoped: true,
  searchFields: ['name'],
});

export const { GET, PUT, DELETE } = routes.single;
