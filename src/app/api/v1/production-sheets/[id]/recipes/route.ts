import { serviceHandler } from '@/lib/api/service-handler';
import { addRecipeToSheet } from '@/lib/services/productionSheet';

/** POST /api/v1/production-sheets/:id/recipes: add one recipe ({ recipeId, scale }). */
export const POST = serviceHandler('write', 'POST /production-sheets/:id/recipes', (ctx, { params, body }) =>
  addRecipeToSheet(ctx, params.id, body)
);
