import { createCrudRoutes } from '@/lib/api/create-crud-routes';
import { createSupplySchema, updateSupplySchema } from '@/lib/validations/supply';
import { createSupply, updateSupply, deleteSupply } from '@/lib/services/supply';

export const supplyRoutes = createCrudRoutes({
  model: 'supply',
  bakeryScoped: true,
  searchFields: ['name', 'sku'],
  allowedIncludes: ['vendors', 'vendors.vendor', 'productSupplies'],
  validators: { create: createSupplySchema, update: updateSupplySchema },
  service: { create: createSupply, update: updateSupply, remove: deleteSupply },
});
