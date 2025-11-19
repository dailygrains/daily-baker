import { z } from 'zod';

/**
 * Validation schema for creating a new ingredient
 */
export const createIngredientSchema = z.object({
  bakeryId: z.string().cuid(),
  name: z.string().min(1, 'Ingredient name is required').max(100),
  currentQty: z.number().nonnegative('Quantity cannot be negative').default(0),
  unit: z.string().min(1, 'Unit is required').max(20),
  costPerUnit: z.number().nonnegative('Cost per unit cannot be negative'),
  vendorId: z.string().cuid().optional().nullable(),
});

/**
 * Validation schema for updating an existing ingredient
 */
export const updateIngredientSchema = z.object({
  id: z.string().cuid(),
  name: z.string().min(1, 'Ingredient name is required').max(100).optional(),
  currentQty: z.number().nonnegative('Quantity cannot be negative').optional(),
  unit: z.string().min(1, 'Unit is required').max(20).optional(),
  costPerUnit: z.number().nonnegative('Cost per unit cannot be negative').optional(),
  vendorId: z.string().cuid().optional().nullable(),
});

/**
 * Type for creating an ingredient (inferred from schema)
 */
export type CreateIngredientInput = z.infer<typeof createIngredientSchema>;

/**
 * Type for updating an ingredient (inferred from schema)
 */
export type UpdateIngredientInput = z.infer<typeof updateIngredientSchema>;
