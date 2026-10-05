import { createCrudRoutes } from '@/lib/api/create-crud-routes';
import { createTagSchema, updateTagSchema } from '@/lib/validations/tag';
import { createTag, updateTag, deleteTag } from '@/lib/services/tag';

export const tagRoutes = createCrudRoutes({
  model: 'tag',
  bakeryScoped: true,
  searchFields: ['name', 'description'],
  allowedIncludes: ['tagType', 'entityTags'],
  validators: { create: createTagSchema, update: updateTagSchema },
  service: { create: createTag, update: updateTag, remove: deleteTag },
});
