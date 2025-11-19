import { z } from 'zod';

/**
 * Validation schema for creating a new vendor
 */
export const createVendorSchema = z.object({
  bakeryId: z.string().cuid(),
  name: z.string().min(1, 'Vendor name is required').max(100),
  contactName: z.string().max(100).optional().nullable(),
  email: z.string().email('Invalid email address').max(100).optional().nullable(),
  phone: z.string().max(20).optional().nullable(),
  website: z.string().url('Invalid website URL').max(255).optional().nullable(),
  address: z.string().max(500).optional().nullable(),
  notes: z.string().max(1000).optional().nullable(),
});

/**
 * Validation schema for updating an existing vendor
 */
export const updateVendorSchema = z.object({
  id: z.string().cuid(),
  name: z.string().min(1, 'Vendor name is required').max(100).optional(),
  contactName: z.string().max(100).optional().nullable(),
  email: z.string().email('Invalid email address').max(100).optional().nullable(),
  phone: z.string().max(20).optional().nullable(),
  website: z.string().url('Invalid website URL').max(255).optional().nullable(),
  address: z.string().max(500).optional().nullable(),
  notes: z.string().max(1000).optional().nullable(),
});

export type CreateVendorInput = z.infer<typeof createVendorSchema>;
export type UpdateVendorInput = z.infer<typeof updateVendorSchema>;
