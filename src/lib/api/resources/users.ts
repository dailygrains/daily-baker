import { createCrudRoutes } from '@/lib/api/create-crud-routes';
import { updateUserSchema } from '@/lib/validations/user';
import { updateUser, deleteUser } from '@/lib/services/user';

/**
 * Platform-admin only. Users are created by sign-up, so there is no POST;
 * bakery links live at /users/:id/bakeries/:bakeryId.
 */
export const userRoutes = createCrudRoutes({
  model: 'user',
  bakeryScoped: false,
  adminOnly: true,
  searchFields: ['email', 'name'],
  allowedIncludes: ['bakeries', 'bakeries.bakery', 'role'],
  validators: { update: updateUserSchema },
  service: { update: updateUser, remove: deleteUser },
});
