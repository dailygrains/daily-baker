import { z } from 'zod';

export const InventoryTransactionType = z.enum([
  'RECEIVE',
  'USE',
  'ADJUST',
  'WASTE',
]);

export const createInventoryTransactionSchema = z.object({
  bakeryId: z.string().cuid(),
  type: InventoryTransactionType,
  ingredientId: z.string().cuid('Invalid ingredient'),
  quantity: z.number().positive('Quantity must be positive'),
  unit: z.string().min(1, 'Unit is required').max(20),
  notes: z.string().max(2000, 'Notes too long').optional().nullable(),
});

export type CreateInventoryTransactionInput = z.infer<
  typeof createInventoryTransactionSchema
>;
