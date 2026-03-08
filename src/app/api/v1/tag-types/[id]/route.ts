import { createCrudRoutes } from '@/lib/api/create-crud-routes';
import { createTagTypeSchema, updateTagTypeSchema } from '@/lib/validations/tag';

const routes = createCrudRoutes({
  model: 'tagType',
  bakeryScoped: true,
  searchFields: ['name'],
  validators: { create: createTagTypeSchema, update: updateTagTypeSchema },
});

export const { GET, PUT, DELETE } = routes.single;
