import { serviceHandler } from '@/lib/api/service-handler';
import { removeRecipeFromSheet, updateRecipeOnSheet } from '@/lib/services/productionSheet';

/*
 * A recipe appears at most once per sheet, so entries are addressed by the
 * recipe's id rather than the entry's own id (same key the dashboard uses).
 */

/** PUT /api/v1/production-sheets/:id/recipes/:recipeId: change { scale?, order? }. */
export const PUT = serviceHandler(
  'write',
  'PUT /production-sheets/:id/recipes/:recipeId',
  (ctx, { params, body }) => updateRecipeOnSheet(ctx, params.id, params.recipeId, body)
);

/** DELETE /api/v1/production-sheets/:id/recipes/:recipeId: remove the recipe from the sheet. */
export const DELETE = serviceHandler(
  'write',
  'DELETE /production-sheets/:id/recipes/:recipeId',
  (ctx, { params }) => removeRecipeFromSheet(ctx, params.id, params.recipeId)
);
