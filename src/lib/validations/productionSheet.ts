import { z } from 'zod';

export const createProductionSheetSchema = z.object({
  bakeryId: z.string().cuid(),
  recipeId: z.string().cuid('Invalid recipe'),
  scale: z
    .number()
    .positive('Scale must be positive')
    .max(100, 'Scale too large'),
  quantity: z
    .string()
    .min(1, 'Quantity description is required')
    .max(100, 'Quantity description too long'),
  notes: z.string().max(2000, 'Notes too long').optional().nullable(),
});

export const updateProductionSheetSchema = z.object({
  id: z.string().cuid(),
  scale: z.number().positive('Scale must be positive').max(100, 'Scale too large').optional(),
  quantity: z
    .string()
    .min(1, 'Quantity description is required')
    .max(100, 'Quantity description too long')
    .optional(),
  notes: z.string().max(2000, 'Notes too long').optional().nullable(),
});

export const completeProductionSheetSchema = z.object({
  id: z.string().cuid(),
});

export type CreateProductionSheetInput = z.infer<typeof createProductionSheetSchema>;
export type UpdateProductionSheetInput = z.infer<typeof updateProductionSheetSchema>;
export type CompleteProductionSheetInput = z.infer<typeof completeProductionSheetSchema>;
