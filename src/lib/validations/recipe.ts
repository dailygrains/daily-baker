import { z } from 'zod';

/**
 * Validation schema for recipe section ingredients
 */
export const recipeSectionIngredientSchema = z.object({
  id: z.string().cuid().optional(), // For updates
  ingredientId: z.string().cuid('Invalid ingredient'),
  quantity: z.number().positive('Quantity must be positive'),
  unit: z.string().min(1, 'Unit is required').max(20),
});

/**
 * Validation schema for recipe sections
 */
export const recipeSectionSchema = z.object({
  id: z.string().cuid().optional(), // For updates
  name: z.string().min(1, 'Section name is required').max(100),
  order: z.number().int().nonnegative('Order must be a non-negative integer'),
  instructions: z.string().max(10000, 'Instructions too long'),
  ingredients: z.array(recipeSectionIngredientSchema).default([]),
});

/**
 * Validation schema for creating a new recipe
 */
export const createRecipeSchema = z.object({
  bakeryId: z.string().cuid(),
  name: z.string().min(1, 'Recipe name is required').max(200),
  description: z.string().max(2000).optional().nullable(),
  yieldQty: z.number().int().positive('Yield quantity must be a positive number'),
  yieldUnit: z.string().min(1, 'Yield unit is required').max(100),
  sections: z.array(recipeSectionSchema).min(1, 'At least one section is required'),
});

/**
 * Validation schema for updating an existing recipe
 */
export const updateRecipeSchema = z.object({
  id: z.string().cuid(),
  name: z.string().min(1, 'Recipe name is required').max(200).optional(),
  description: z.string().max(2000).optional().nullable(),
  yieldQty: z.number().int().positive('Yield quantity must be a positive number').optional(),
  yieldUnit: z.string().min(1, 'Yield unit is required').max(100).optional(),
  sections: z.array(recipeSectionSchema).optional(),
});

export type RecipeSectionIngredientInput = z.infer<typeof recipeSectionIngredientSchema>;
export type RecipeSectionInput = z.infer<typeof recipeSectionSchema>;
export type CreateRecipeInput = z.infer<typeof createRecipeSchema>;
export type UpdateRecipeInput = z.infer<typeof updateRecipeSchema>;
