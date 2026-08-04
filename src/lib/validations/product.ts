import { z } from 'zod';

export const productSupplySchema = z.object({
  supplyId: z.string().cuid(),
  quantity: z.number().positive('Quantity must be positive'),
  unit: z.string().min(1).max(50).default('each'),
  wasteFactor: z.number().min(1, 'Waste factor must be at least 1').default(1),
  costOverride: z.number().nonnegative().optional().nullable(),
  notes: z.string().max(500).optional().nullable(),
});

export const createProductSchema = z.object({
  bakeryId: z.string().cuid(),
  name: z.string().min(1, 'Product name is required').max(200),
  sku: z.string().max(100).optional().nullable(),
  description: z.string().max(2000).optional().nullable(),
  recipeId: z.string().cuid('Recipe is required'),
  recipeScale: z.number().positive('Scale must be positive').default(1),
  batchYieldQty: z.number().int().positive('Yield must be at least 1'),
  laborCost: z.number().nonnegative().default(0),
  overheadCost: z.number().nonnegative().default(0),
  retailPrice: z.number().nonnegative().optional().nullable(),
  wholesalePrice: z.number().nonnegative().optional().nullable(),
  targetMarginPct: z.number().min(0).max(100).optional().nullable(),
  productSupplies: z.array(productSupplySchema).optional(),
});

export const updateProductSchema = z.object({
  id: z.string().cuid(),
  name: z.string().min(1).max(200).optional(),
  sku: z.string().max(100).optional().nullable(),
  description: z.string().max(2000).optional().nullable(),
  recipeId: z.string().cuid().optional(),
  recipeScale: z.number().positive().optional(),
  batchYieldQty: z.number().int().positive().optional(),
  laborCost: z.number().nonnegative().optional(),
  overheadCost: z.number().nonnegative().optional(),
  retailPrice: z.number().nonnegative().optional().nullable(),
  wholesalePrice: z.number().nonnegative().optional().nullable(),
  targetMarginPct: z.number().min(0).max(100).optional().nullable(),
  productSupplies: z.array(productSupplySchema).optional(),
});

export type ProductSupplyInput = z.infer<typeof productSupplySchema>;
export type CreateProductInput = z.infer<typeof createProductSchema>;
export type UpdateProductInput = z.infer<typeof updateProductSchema>;
