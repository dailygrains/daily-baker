import { z } from 'zod';

/**
 * Validation schema for creating a new inventory item
 */
export const createInventoryItemSchema = z.object({
  bakeryId: z.string().cuid(),
  ingredientId: z.string().cuid(),
  quantity: z.number().nonnegative('Quantity cannot be negative'),
  unit: z.string().min(1, 'Unit is required').max(20),
  vendorId: z.string().cuid().optional(),
  purchasePrice: z.number().nonnegative('Purchase price cannot be negative').optional(),
  purchaseDate: z.date().optional(),
  batchNumber: z.string().max(100).optional(),
  expirationDate: z.date().optional(),
  location: z.string().max(200).optional(),
  notes: z.string().max(1000).optional(),
});

/**
 * Validation schema for updating an existing inventory item
 */
export const updateInventoryItemSchema = z.object({
  id: z.string().cuid(),
  quantity: z.number().nonnegative('Quantity cannot be negative').optional(),
  unit: z.string().min(1, 'Unit is required').max(20).optional(),
  vendorId: z.string().cuid().optional(),
  purchasePrice: z.number().nonnegative('Purchase price cannot be negative').optional(),
  purchaseDate: z.date().optional(),
  batchNumber: z.string().max(100).optional(),
  expirationDate: z.date().optional(),
  location: z.string().max(200).optional(),
  notes: z.string().max(1000).optional(),
});

/**
 * Type for creating an inventory item (inferred from schema)
 */
export type CreateInventoryItemInput = z.infer<typeof createInventoryItemSchema>;

/**
 * Type for updating an inventory item (inferred from schema)
 */
export type UpdateInventoryItemInput = z.infer<typeof updateInventoryItemSchema>;
