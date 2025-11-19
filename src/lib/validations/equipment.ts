import { z } from 'zod';

/**
 * Equipment status enum matching Prisma schema
 */
export const EquipmentStatus = z.enum([
  'CONSIDERING',
  'ORDERED',
  'RECEIVED',
  'IN_USE',
  'MAINTENANCE',
  'RETIRED',
]);

export type EquipmentStatusType = z.infer<typeof EquipmentStatus>;

/**
 * Validation schema for creating new equipment
 */
export const createEquipmentSchema = z.object({
  bakeryId: z.string().cuid(),
  name: z.string().min(1, 'Equipment name is required').max(200),
  status: EquipmentStatus.default('CONSIDERING'),
  vendorId: z.string().cuid().optional().nullable(),
  purchaseDate: z.date().optional().nullable(),
  cost: z.number().nonnegative('Cost cannot be negative').optional().nullable(),
  quantity: z.number().int().positive('Quantity must be at least 1').default(1),
  serialNumber: z.string().max(100).optional().nullable(),
  notes: z.string().max(2000).optional().nullable(),
});

/**
 * Validation schema for updating existing equipment
 */
export const updateEquipmentSchema = z.object({
  id: z.string().cuid(),
  name: z.string().min(1, 'Equipment name is required').max(200).optional(),
  status: EquipmentStatus.optional(),
  vendorId: z.string().cuid().optional().nullable(),
  purchaseDate: z.date().optional().nullable(),
  cost: z.number().nonnegative('Cost cannot be negative').optional().nullable(),
  quantity: z.number().int().positive('Quantity must be at least 1').optional(),
  serialNumber: z.string().max(100).optional().nullable(),
  notes: z.string().max(2000).optional().nullable(),
});

export type CreateEquipmentInput = z.infer<typeof createEquipmentSchema>;
export type UpdateEquipmentInput = z.infer<typeof updateEquipmentSchema>;
