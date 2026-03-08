import { createCrudRoutes } from '@/lib/api/create-crud-routes';
import { createRecipeSchema, updateRecipeSchema } from '@/lib/validations/recipe';

const routes = createCrudRoutes({
  model: 'recipe',
  bakeryScoped: true,
  searchFields: ['name'],
  allowedIncludes: ['sections', 'sections.ingredients', 'productionSheetRecipes'],
  validators: { create: createRecipeSchema, update: updateRecipeSchema },
});

export const { GET, PUT, DELETE } = routes.single;
