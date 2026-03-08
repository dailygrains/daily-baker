import { z } from 'zod';

/**
 * Validation schema for creating a new API key
 */
export const createApiKeySchema = z.object({
  bakeryId: z.string().cuid(),
  name: z.string().min(1, 'Name is required').max(100),
  scopes: z.array(z.enum(['read', 'write'])).min(1, 'At least one scope required'),
  expiresAt: z.date().optional().nullable(),
});

export type CreateApiKeyInput = z.infer<typeof createApiKeySchema>;
