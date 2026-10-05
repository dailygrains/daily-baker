import { createCrudRoutes } from '@/lib/api/create-crud-routes';
import { createRecipeSchema, updateRecipeSchema } from '@/lib/validations/recipe';
import { createRecipe, updateRecipe, deleteRecipe } from '@/lib/services/recipe';

export const recipeRoutes = createCrudRoutes({
  model: 'recipe',
  bakeryScoped: true,
  searchFields: ['name'],
  allowedIncludes: ['sections', 'sections.ingredients', 'productionSheetRecipes', 'products'],
  validators: { create: createRecipeSchema, update: updateRecipeSchema },
  service: { create: createRecipe, update: updateRecipe, remove: deleteRecipe },
});
