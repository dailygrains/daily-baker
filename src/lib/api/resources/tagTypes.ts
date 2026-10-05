import { createCrudRoutes } from '@/lib/api/create-crud-routes';
import { createTagTypeSchema, updateTagTypeSchema } from '@/lib/validations/tag';
import { createTagType, updateTagType, deleteTagType } from '@/lib/services/tag';

export const tagTypeRoutes = createCrudRoutes({
  model: 'tagType',
  bakeryScoped: true,
  searchFields: ['name', 'description'],
  allowedIncludes: ['tags'],
  validators: { create: createTagTypeSchema, update: updateTagTypeSchema },
  service: { create: createTagType, update: updateTagType, remove: deleteTagType },
});
