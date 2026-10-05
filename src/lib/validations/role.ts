import { z } from 'zod';

const permissionsSchema = z.record(z.string(), z.boolean());

export const createRoleSchema = z.object({
  name: z.string().trim().min(1, 'Name is required').max(100, 'Name must be 100 characters or less'),
  description: z.string().optional().nullable(),
  permissions: permissionsSchema,
});

export const updateRoleSchema = createRoleSchema.partial().extend({
  id: z.string().min(1),
});

export type CreateRoleInput = z.infer<typeof createRoleSchema>;
export type UpdateRoleInput = z.infer<typeof updateRoleSchema>;
