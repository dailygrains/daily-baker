import { z } from 'zod';

export const productSupplySchema = z.object({
  supplyId: z.string().cuid(),
  quantity: z.number().positive('Quantity must be positive'),
  unit: z.string().min(1).max(50).default('each'),
  wasteFactor: z.number().min(1, 'Waste factor must be at least 1').default(1),
  costOverride: z.number().nonnegative().optional().nullable(),
  notes: z.string().max(500).optional().nullable(),
});

/**
 * A variation must be costable: either it has a finished unit weight (so its
 * ingredient cost can be allocated by share of batch dough weight), or an
 * explicit per-batch yield. Without one of the two there is no way to derive a
 * per-unit cost.
 */
const requireCostBasis = (
  value: { unitWeightG?: number | null; batchYieldQty?: number | null },
  ctx: z.RefinementCtx
) => {
  if (
    (value.unitWeightG === undefined || value.unitWeightG === null) &&
    (value.batchYieldQty === undefined || value.batchYieldQty === null)
  ) {
    ctx.addIssue({
      code: 'custom',
      path: ['unitWeightG'],
      message: 'Set a unit weight, or a batch yield if this size is not sold by weight',
    });
  }
};

export const productVariationSchema = z
  .object({
    /** Present when updating an existing variation; absent when creating one. */
    id: z.string().cuid().optional(),
    name: z.string().min(1, 'Variation name is required').max(200),
    sku: z.string().max(100).optional().nullable(),
    squareVariationId: z.string().max(100).optional().nullable(),
    unitWeightG: z.number().positive('Unit weight must be positive').optional().nullable(),
    batchYieldQty: z.number().int().positive('Yield must be at least 1').optional().nullable(),
    laborCost: z.number().nonnegative().default(0),
    overheadCost: z.number().nonnegative().default(0),
    retailPrice: z.number().nonnegative().optional().nullable(),
    wholesalePrice: z.number().nonnegative().optional().nullable(),
    targetMarginPct: z.number().min(0).max(100).optional().nullable(),
    isActive: z.boolean().default(true),
    sortOrder: z.number().int().nonnegative().default(0),
    variationSupplies: z.array(productSupplySchema).optional(),
  })
  .superRefine(requireCostBasis);

export const createProductSchema = z.object({
  bakeryId: z.string().cuid(),
  name: z.string().min(1, 'Product name is required').max(200),
  description: z.string().max(2000).optional().nullable(),
  squareItemId: z.string().max(100).optional().nullable(),
  recipeId: z.string().cuid('Recipe is required'),
  recipeScale: z.number().positive('Scale must be positive').default(1),
  isActive: z.boolean().default(true),
  variations: z
    .array(productVariationSchema)
    .min(1, 'Add at least one variation (use a single "Regular" size if it has only one)'),
});

export const updateProductSchema = z.object({
  id: z.string().cuid(),
  name: z.string().min(1).max(200).optional(),
  description: z.string().max(2000).optional().nullable(),
  squareItemId: z.string().max(100).optional().nullable(),
  recipeId: z.string().cuid().optional(),
  recipeScale: z.number().positive().optional(),
  isActive: z.boolean().optional(),
  /**
   * When present this is the full desired set of variations: existing ones are
   * matched by id and updated, those missing from the list are removed.
   */
  variations: z.array(productVariationSchema).min(1).optional(),
});

export type ProductSupplyInput = z.infer<typeof productSupplySchema>;
export type ProductVariationInput = z.infer<typeof productVariationSchema>;
export type CreateProductInput = z.infer<typeof createProductSchema>;
export type UpdateProductInput = z.infer<typeof updateProductSchema>;
