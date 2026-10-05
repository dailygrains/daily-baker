import { createCrudRoutes } from '@/lib/api/create-crud-routes';
import { createBakerySchema, updateBakerySchema } from '@/lib/validations/bakery';
import { createBakery, updateBakery, deleteBakery } from '@/lib/services/bakery';

export const bakeryRoutes = createCrudRoutes({
  model: 'bakery',
  bakeryScoped: false,
  adminOnly: true,
  searchFields: ['name'],
  allowedIncludes: ['users', 'users.user'],
  validators: { create: createBakerySchema, update: updateBakerySchema },
  service: { create: createBakery, update: updateBakery, remove: deleteBakery },
});
