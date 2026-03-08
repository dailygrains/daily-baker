import { createCrudRoutes } from '@/lib/api/create-crud-routes';

const routes = createCrudRoutes({
  model: 'user',
  bakeryScoped: false,
  adminOnly: true,
  searchFields: ['email', 'name'],
});

export const { GET, PUT, DELETE } = routes.single;
