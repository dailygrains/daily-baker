import { createCrudRoutes } from '@/lib/api/create-crud-routes';
import { createProductSchema, updateProductSchema } from '@/lib/validations/product';
import {
  createProduct,
  updateProduct,
  deleteProduct,
} from '@/lib/services/product';

/** Cost warnings ride along on the returned product. */
const withWarnings = ({ product, warnings }: { product: object; warnings: string[] }) => ({
  ...product,
  warnings,
});

export const productRoutes = createCrudRoutes({
  model: 'product',
  bakeryScoped: true,
  searchFields: ['name'],
  allowedIncludes: ['recipe', 'variations', 'variations.variationSupplies'],
  validators: { create: createProductSchema, update: updateProductSchema },
  service: {
    create: async (ctx, body) => withWarnings(await createProduct(ctx, body)),
    update: async (ctx, id, body) => withWarnings(await updateProduct(ctx, id, body)),
    remove: deleteProduct,
  },
});
