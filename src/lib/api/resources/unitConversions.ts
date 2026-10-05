import { createCrudRoutes } from '@/lib/api/create-crud-routes';
import { createUnitConversionSchema, updateUnitConversionSchema } from '@/lib/validations/unitConversion';
import {
  createUnitConversion,
  updateUnitConversion,
  deleteUnitConversion,
} from '@/lib/services/unitConversion';

/**
 * Global reference data (no bakeryId). Any authenticated caller can read;
 * the services restrict writes to platform admins.
 */
export const unitConversionRoutes = createCrudRoutes({
  model: 'unitConversion',
  bakeryScoped: false,
  searchFields: ['fromUnit', 'toUnit', 'category'],
  validators: { create: createUnitConversionSchema, update: updateUnitConversionSchema },
  service: { create: createUnitConversion, update: updateUnitConversion, remove: deleteUnitConversion },
});
