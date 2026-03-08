import { createCrudRoutes } from '@/lib/api/create-crud-routes';
import { createTagSchema, updateTagSchema } from '@/lib/validations/tag';

const routes = createCrudRoutes({
  model: 'tag',
  bakeryScoped: true,
  searchFields: ['name'],
  allowedIncludes: ['tagType'],
  validators: { create: createTagSchema, update: updateTagSchema },
});

export const { GET, PUT, DELETE } = routes.single;
