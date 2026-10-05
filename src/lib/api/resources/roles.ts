import { createCrudRoutes } from '@/lib/api/create-crud-routes';
import { createRoleSchema, updateRoleSchema } from '@/lib/validations/role';
import { createRole, updateRole, deleteRole } from '@/lib/services/role';

/** Platform-wide roles (no bakeryId), managed by platform admins only. */
export const roleRoutes = createCrudRoutes({
  model: 'role',
  bakeryScoped: false,
  adminOnly: true,
  searchFields: ['name'],
  allowedIncludes: ['users'],
  validators: { create: createRoleSchema, update: updateRoleSchema },
  service: { create: createRole, update: updateRole, remove: deleteRole },
});
