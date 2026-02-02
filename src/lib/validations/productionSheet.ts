import { z } from 'zod';

// Schema for a recipe entry on a production sheet
export const productionSheetRecipeSchema = z.object({
  recipeId: z.string().cuid('Invalid recipe'),
  scale: z.number().positive('Scale must be positive').max(100, 'Scale too large'),
  order: z.number().int().min(0).optional(),
});

export const createProductionSheetSchema = z.object({
  bakeryId: z.string().cuid(),
  description: z.string().max(500, 'Description too long').optional().nullable(),
  scheduledFor: z.coerce.date().optional().nullable(),
  notes: z.string().max(2000, 'Notes too long').optional().nullable(),
  recipes: z
    .array(productionSheetRecipeSchema)
    .min(1, 'At least one recipe is required'),
});

export const updateProductionSheetSchema = z.object({
  id: z.string().cuid(),
  description: z.string().max(500, 'Description too long').optional().nullable(),
  scheduledFor: z.coerce.date().optional().nullable(),
  notes: z.string().max(2000, 'Notes too long').optional().nullable(),
  // When updating recipes, we replace the entire list
  recipes: z.array(productionSheetRecipeSchema).min(1).optional(),
});

export const completeProductionSheetSchema = z.object({
  id: z.string().cuid(),
});

export const deleteProductionSheetSchema = z.object({
  id: z.string().cuid(),
});

// Schema for adding a single recipe to an existing sheet
export const addRecipeToSheetSchema = z.object({
  productionSheetId: z.string().cuid(),
  recipeId: z.string().cuid('Invalid recipe'),
  scale: z.number().positive('Scale must be positive').max(100, 'Scale too large'),
});

// Schema for updating a recipe's scale or order on a sheet
export const updateRecipeOnSheetSchema = z.object({
  productionSheetId: z.string().cuid(),
  recipeId: z.string().cuid('Invalid recipe'),
  scale: z.number().positive('Scale must be positive').max(100, 'Scale too large').optional(),
  order: z.number().int().min(0).optional(),
});

// Schema for removing a recipe from a sheet
export const removeRecipeFromSheetSchema = z.object({
  productionSheetId: z.string().cuid(),
  recipeId: z.string().cuid('Invalid recipe'),
});

export type ProductionSheetRecipeInput = z.infer<typeof productionSheetRecipeSchema>;
export type CreateProductionSheetInput = z.infer<typeof createProductionSheetSchema>;
export type UpdateProductionSheetInput = z.infer<typeof updateProductionSheetSchema>;
export type CompleteProductionSheetInput = z.infer<typeof completeProductionSheetSchema>;
export type DeleteProductionSheetInput = z.infer<typeof deleteProductionSheetSchema>;
export type AddRecipeToSheetInput = z.infer<typeof addRecipeToSheetSchema>;
export type UpdateRecipeOnSheetInput = z.infer<typeof updateRecipeOnSheetSchema>;
export type RemoveRecipeFromSheetInput = z.infer<typeof removeRecipeFromSheetSchema>;
