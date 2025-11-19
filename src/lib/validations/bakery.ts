import { z } from 'zod';

export const createBakerySchema = z.object({
  name: z.string().min(1, 'Name is required').max(100, 'Name must be 100 characters or less'),
  description: z.string().optional(),
  address: z.string().optional(),
  phone: z.string().optional(),
  email: z.string().email('Invalid email address').optional().or(z.literal('')),
  website: z.string().url('Invalid URL').optional().or(z.literal('')),
});

export const updateBakerySchema = createBakerySchema.partial().extend({
  id: z.string().cuid(),
});

export type CreateBakeryInput = z.infer<typeof createBakerySchema>;
export type UpdateBakeryInput = z.infer<typeof updateBakerySchema>;
