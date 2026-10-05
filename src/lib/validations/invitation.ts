import { z } from 'zod';

/** Token, expiry, status and creator are always set by the server. */
export const createInvitationSchema = z
  .object({
    email: z.string().trim().email('Invalid email address'),
    bakeryId: z.string().min(1).nullable().optional(),
    roleId: z.string().min(1).nullable().optional(),
  })
  .strict();

export type CreateInvitationInput = z.infer<typeof createInvitationSchema>;
