import { z } from 'zod';

/**
 * Validation schema for creating a new ingredient
 * Note: currentQty and costPerUnit are now managed via Inventory/InventoryLot system
 */
export const createIngredientSchema = z.object({
  bakeryId: z.string().cuid(),
  name: z.string().min(1, 'Ingredient name is required').max(100),
  unit: z.string().min(1, 'Unit is required').max(20), // Reference unit for recipes
});

/**
 * Validation schema for updating an existing ingredient
 */
export const updateIngredientSchema = z.object({
  id: z.string().cuid(),
  name: z.string().min(1, 'Ingredient name is required').max(100).optional(),
  unit: z.string().min(1, 'Unit is required').max(20).optional(),
  lowStockThreshold: z.number().min(0).nullable().optional(), // null = no alert, 0 = disabled
});

/**
 * Type for creating an ingredient (inferred from schema)
 */
export type CreateIngredientInput = z.infer<typeof createIngredientSchema>;

/**
 * Type for updating an ingredient (inferred from schema)
 */
export type UpdateIngredientInput = z.infer<typeof updateIngredientSchema>;
