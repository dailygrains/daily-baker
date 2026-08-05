import { createCrudRoutes } from '@/lib/api/create-crud-routes';
import { createRecipeSchema, updateRecipeSchema } from '@/lib/validations/recipe';
import { recipeBeforeCreate, recipeBeforeUpdate } from '@/lib/api/recipe-hooks';

const routes = createCrudRoutes({
  model: 'recipe',
  bakeryScoped: true,
  searchFields: ['name'],
  allowedIncludes: ['sections', 'sections.ingredients', 'productionSheetRecipes'],
  validators: { create: createRecipeSchema, update: updateRecipeSchema },
  beforeCreate: recipeBeforeCreate,
  beforeUpdate: recipeBeforeUpdate,
});

export const { GET, POST } = routes.collection;
