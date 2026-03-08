import { createCrudRoutes } from '@/lib/api/create-crud-routes';

const routes = createCrudRoutes({
  model: 'activityLog',
  bakeryScoped: true,
  readOnly: true,
  searchFields: ['action'],
});

export const { GET } = routes.collection;
