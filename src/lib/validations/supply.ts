import { z } from 'zod';

export const SupplyCategory = z.enum([
  'PACKAGING',
  'DISPOSABLE',
  'LABEL',
  'CLEANING',
  'OTHER',
]);

export type SupplyCategoryType = z.infer<typeof SupplyCategory>;

export const createSupplySchema = z.object({
  bakeryId: z.string().cuid(),
  name: z.string().min(1, 'Supply name is required').max(200),
  sku: z.string().max(100).optional().nullable(),
  category: SupplyCategory.default('OTHER'),
  description: z.string().max(2000).optional().nullable(),
  unit: z.string().min(1, 'Unit is required').max(50),
  unitsPerCase: z.number().int().positive().optional().nullable(),
  costPerUnit: z.number().nonnegative('Cost cannot be negative').default(0),
  quantityOnHand: z.number().nonnegative('Quantity cannot be negative').default(0),
  lowStockThreshold: z.number().nonnegative().optional().nullable(),
  vendorIds: z.array(z.string().cuid()).optional(),
});

export const updateSupplySchema = z.object({
  id: z.string().cuid(),
  name: z.string().min(1, 'Supply name is required').max(200).optional(),
  sku: z.string().max(100).optional().nullable(),
  category: SupplyCategory.optional(),
  description: z.string().max(2000).optional().nullable(),
  unit: z.string().min(1).max(50).optional(),
  unitsPerCase: z.number().int().positive().optional().nullable(),
  costPerUnit: z.number().nonnegative('Cost cannot be negative').optional(),
  quantityOnHand: z.number().nonnegative('Quantity cannot be negative').optional(),
  lowStockThreshold: z.number().nonnegative().optional().nullable(),
  vendorIds: z.array(z.string().cuid()).optional(),
});

export type CreateSupplyInput = z.infer<typeof createSupplySchema>;
export type UpdateSupplyInput = z.infer<typeof updateSupplySchema>;
