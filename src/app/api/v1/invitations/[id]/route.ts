import { createCrudRoutes } from '@/lib/api/create-crud-routes';

const routes = createCrudRoutes({
  model: 'invitation',
  bakeryScoped: true,
  searchFields: ['email'],
});

export const { GET, PUT, DELETE } = routes.single;
