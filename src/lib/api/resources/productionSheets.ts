import { createCrudRoutes } from '@/lib/api/create-crud-routes';
import {
  createProductionSheetSchema,
  updateProductionSheetSchema,
} from '@/lib/validations/productionSheet';
import {
  createProductionSheet,
  updateProductionSheet,
  deleteProductionSheet,
} from '@/lib/services/productionSheet';

export const productionSheetRoutes = createCrudRoutes({
  model: 'productionSheet',
  bakeryScoped: true,
  // ProductionSheet has no name; description and notes are its text fields.
  searchFields: ['description', 'notes'],
  allowedIncludes: ['recipes', 'recipes.recipe', 'usages'],
  validators: { create: createProductionSheetSchema, update: updateProductionSheetSchema },
  service: {
    // Inventory shortfall warnings ride along on the returned sheet.
    create: async (ctx, body) => {
      const { sheet, warnings } = await createProductionSheet(ctx, body);
      return { ...sheet, warnings };
    },
    update: updateProductionSheet,
    remove: deleteProductionSheet,
  },
});
