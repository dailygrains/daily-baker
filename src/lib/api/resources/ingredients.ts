import { createCrudRoutes } from '@/lib/api/create-crud-routes';
import { createIngredientSchema, updateIngredientSchema } from '@/lib/validations/ingredient';
import { createIngredient, updateIngredient, deleteIngredient } from '@/lib/services/ingredient';

export const ingredientRoutes = createCrudRoutes({
  model: 'ingredient',
  bakeryScoped: true,
  searchFields: ['name'],
  allowedIncludes: ['vendors', 'vendors.vendor', 'inventory', 'inventory.lots'],
  validators: { create: createIngredientSchema, update: updateIngredientSchema },
  service: { create: createIngredient, update: updateIngredient, remove: deleteIngredient },
});
