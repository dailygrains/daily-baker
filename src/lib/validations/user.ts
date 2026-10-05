import { z } from 'zod';

/**
 * The only user fields an administrator may edit. Identity fields (clerkId,
 * email) come from Clerk and isPlatformAdmin is never writable, so unknown
 * keys are rejected rather than silently dropped.
 */
export const updateUserSchema = z
  .object({
    id: z.string().min(1),
    name: z.string().trim().min(1, 'Name cannot be empty').max(200).optional(),
    roleId: z.string().min(1).nullable().optional(),
  })
  .strict();

export type UpdateUserInput = z.infer<typeof updateUserSchema>;
