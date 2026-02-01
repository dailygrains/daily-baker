import { z } from 'zod';

/**
 * Usage reason enum for inventory deductions
 */
export const UsageReasonSchema = z.enum(['USE', 'WASTE', 'ADJUST']);
export type UsageReason = z.infer<typeof UsageReasonSchema>;

/**
 * Schema for adding a new inventory lot (purchase)
 */
export const addInventoryLotSchema = z.object({
  ingredientId: z.string().cuid('Invalid ingredient ID'),
  quantity: z.number().positive('Quantity must be positive'),
  unit: z.string().min(1, 'Unit is required').max(20),
  costPerUnit: z.number().nonnegative('Cost per unit cannot be negative'),
  expiresAt: z.date().optional().nullable(),
  vendorId: z.string().cuid('Invalid vendor ID').optional().nullable(),
  notes: z.string().max(2000, 'Notes too long').optional().nullable(),
});

export type AddInventoryLotInput = z.infer<typeof addInventoryLotSchema>;

/**
 * Schema for using inventory (FIFO deduction)
 */
export const useInventorySchema = z.object({
  ingredientId: z.string().cuid('Invalid ingredient ID'),
  quantity: z.number().positive('Quantity must be positive'),
  unit: z.string().min(1, 'Unit is required').max(20),
  reason: UsageReasonSchema,
  productionSheetId: z.string().cuid('Invalid production sheet ID').optional().nullable(),
  notes: z.string().max(2000, 'Notes too long').optional().nullable(),
});

export type UseInventoryInput = z.infer<typeof useInventorySchema>;

/**
 * Schema for adjusting inventory (manual corrections)
 * Quantity can be negative for adjustments
 */
export const adjustInventorySchema = z.object({
  lotId: z.string().cuid('Invalid lot ID'),
  quantity: z.number().refine((val) => val !== 0, 'Quantity cannot be zero'),
  notes: z.string().max(2000, 'Notes too long').optional().nullable(),
});

export type AdjustInventoryInput = z.infer<typeof adjustInventorySchema>;

/**
 * Schema for updating a lot's metadata (not quantity)
 */
export const updateInventoryLotSchema = z.object({
  id: z.string().cuid('Invalid lot ID'),
  expiresAt: z.date().optional().nullable(),
  vendorId: z.string().cuid('Invalid vendor ID').optional().nullable(),
  notes: z.string().max(2000, 'Notes too long').optional().nullable(),
});

export type UpdateInventoryLotInput = z.infer<typeof updateInventoryLotSchema>;
