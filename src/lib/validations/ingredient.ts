import { z } from 'zod';

/**
 * Validation schema for creating a new ingredient
 */
export const createIngredientSchema = z.object({
  bakeryId: z.string().cuid(),
  name: z.string().min(1, 'Ingredient name is required').max(100),
  description: z.string().max(1000).optional(),
  category: z.string().max(50).optional(),
  defaultUnit: z.string().min(1, 'Default unit is required').max(20),
  reorderLevel: z.number().nonnegative('Reorder level cannot be negative').optional(),
});

/**
 * Validation schema for updating an existing ingredient
 */
export const updateIngredientSchema = z.object({
  id: z.string().cuid(),
  name: z.string().min(1, 'Ingredient name is required').max(100).optional(),
  description: z.string().max(1000).optional(),
  category: z.string().max(50).optional(),
  defaultUnit: z.string().min(1, 'Default unit is required').max(20).optional(),
  reorderLevel: z.number().nonnegative('Reorder level cannot be negative').optional(),
});

/**
 * Type for creating an ingredient (inferred from schema)
 */
export type CreateIngredientInput = z.infer<typeof createIngredientSchema>;

/**
 * Type for updating an ingredient (inferred from schema)
 */
export type UpdateIngredientInput = z.infer<typeof updateIngredientSchema>;
