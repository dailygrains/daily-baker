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
  inventoryItemId: z.string().cuid('Invalid inventory item'),
  quantity: z.number().positive('Quantity must be positive'),
  unit: z.string().min(1, 'Unit is required').max(20),
  unitCost: z.number().nonnegative('Unit cost cannot be negative').optional(),
  totalCost: z.number().nonnegative('Total cost cannot be negative').optional(),
  notes: z.string().max(2000, 'Notes too long').optional().nullable(),
  bakeSheetId: z.string().cuid().optional(),
});

export type CreateInventoryTransactionInput = z.infer<
  typeof createInventoryTransactionSchema
>;
