import { createCrudRoutes } from '@/lib/api/create-crud-routes';
import { createEquipmentSchema, updateEquipmentSchema } from '@/lib/validations/equipment';

const routes = createCrudRoutes({
  model: 'equipment',
  bakeryScoped: true,
  searchFields: ['name'],
  allowedIncludes: ['vendor'],
  validators: { create: createEquipmentSchema, update: updateEquipmentSchema },
});

export const { GET, POST } = routes.collection;
