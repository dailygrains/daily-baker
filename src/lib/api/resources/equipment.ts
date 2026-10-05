import { createCrudRoutes } from '@/lib/api/create-crud-routes';
import { createEquipmentSchema, updateEquipmentSchema } from '@/lib/validations/equipment';
import { createEquipment, updateEquipment, deleteEquipment } from '@/lib/services/equipment';

export const equipmentRoutes = createCrudRoutes({
  model: 'equipment',
  bakeryScoped: true,
  searchFields: ['name', 'serialNumber'],
  allowedIncludes: ['vendor'],
  validators: { create: createEquipmentSchema, update: updateEquipmentSchema },
  service: { create: createEquipment, update: updateEquipment, remove: deleteEquipment },
});
