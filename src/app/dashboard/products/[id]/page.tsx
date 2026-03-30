import { getCurrentUser } from '@/lib/clerk';
import { redirect } from 'next/navigation';
import { SetPageHeader } from '@/components/layout/SetPageHeader';
import { getProductById } from '@/app/actions/product';
import Link from 'next/link';

export default async function ProductDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const user = await getCurrentUser();
  const { id } = await params;

  if (!user) {
    redirect('/sign-in');
  }

  if (!user.bakeryId) {
    redirect('/dashboard');
  }

  const productResult = await getProductById(id);

  if (!productResult.success || !productResult.data) {
    redirect('/dashboard/products');
  }

  const product = productResult.data;

  const ingredientCost = Number(product.ingredientCost);
  const supplyCost = Number(product.supplyCost);
  const laborCost = Number(product.laborCost);
  const overheadCost = Number(product.overheadCost);
  const totalCost = Number(product.totalCost);
  const retailPrice = product.retailPrice ? Number(product.retailPrice) : null;
  const wholesalePrice = product.wholesalePrice ? Number(product.wholesalePrice) : null;
  const targetMarginPct = product.targetMarginPct ? Number(product.targetMarginPct) : null;
  const recipeScale = Number(product.recipeScale);

  const margin =
    retailPrice && retailPrice > 0
      ? ((retailPrice - totalCost) / retailPrice) * 100
      : null;

  return (
    <>
      <SetPageHeader
        title={product.name}
        breadcrumbs={[
          { label: 'Products', href: '/dashboard/products' },
          { label: product.name },
        ]}
        actions={
          <Link
            href={`/dashboard/products/${id}/edit`}
            className="btn btn-primary"
          >
            Edit
          </Link>
        }
      />

      <div className="space-y-8">
        {/* Cost Breakdown */}
        <section className="space-y-4">
          <h2 className="text-xl font-semibold">Cost Breakdown</h2>
          <div className="card bg-base-100 p-4">
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
              <div>
                <p className="text-sm text-base-content/70">Ingredient Cost</p>
                <p className="text-2xl font-bold">${ingredientCost.toFixed(4)}</p>
              </div>
              <div>
                <p className="text-sm text-base-content/70">Supply Cost</p>
                <p className="text-2xl font-bold">${supplyCost.toFixed(4)}</p>
              </div>
              <div>
                <p className="text-sm text-base-content/70">Labor Cost</p>
                <p className="text-2xl font-bold">${laborCost.toFixed(4)}</p>
              </div>
              <div>
                <p className="text-sm text-base-content/70">Overhead Cost</p>
                <p className="text-2xl font-bold">${overheadCost.toFixed(4)}</p>
              </div>
              <div>
                <p className="text-sm text-base-content/70">Total Cost</p>
                <p className="text-2xl font-bold text-primary">${totalCost.toFixed(4)}</p>
              </div>
            </div>
          </div>
        </section>

        {/* Recipe */}
        <section className="space-y-4">
          <h2 className="text-xl font-semibold">Recipe</h2>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <p className="text-sm text-base-content/70">Recipe</p>
              <Link
                href={`/dashboard/recipes/${product.recipe.id}`}
                className="text-lg font-semibold hover:text-primary"
              >
                {product.recipe.name}
              </Link>
            </div>
            <div>
              <p className="text-sm text-base-content/70">Scale</p>
              <p className="text-lg font-semibold">{recipeScale}x</p>
            </div>
            <div>
              <p className="text-sm text-base-content/70">Batch Yield</p>
              <p className="text-lg font-semibold">
                {product.batchYieldQty} {product.recipe.yieldUnit ? `(${product.recipe.yieldUnit})` : 'units'}
              </p>
            </div>
          </div>
        </section>

        {/* Pricing */}
        <section className="space-y-4">
          <h2 className="text-xl font-semibold">Pricing</h2>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <div>
              <p className="text-sm text-base-content/70">Retail Price</p>
              <p className="text-2xl font-bold">
                {retailPrice !== null ? `$${retailPrice.toFixed(2)}` : '-'}
              </p>
            </div>
            <div>
              <p className="text-sm text-base-content/70">Wholesale Price</p>
              <p className="text-2xl font-bold">
                {wholesalePrice !== null ? `$${wholesalePrice.toFixed(2)}` : '-'}
              </p>
            </div>
            <div>
              <p className="text-sm text-base-content/70">Margin</p>
              <p
                className={`text-2xl font-bold ${margin !== null && margin < 0 ? 'text-error' : 'text-success'}`}
              >
                {margin !== null ? `${margin.toFixed(1)}%` : '-'}
              </p>
            </div>
            <div>
              <p className="text-sm text-base-content/70">Target Margin</p>
              <p className="text-2xl font-bold">
                {targetMarginPct !== null ? `${targetMarginPct.toFixed(1)}%` : '-'}
              </p>
            </div>
          </div>
        </section>

        {/* Bill of Materials */}
        {product.productSupplies.length > 0 && (
          <section className="space-y-4">
            <h2 className="text-xl font-semibold">Bill of Materials (Supplies)</h2>
            <div className="overflow-x-auto">
              <table className="table table-zebra table-lg">
                <thead>
                  <tr>
                    <th>Supply</th>
                    <th>Category</th>
                    <th>Quantity</th>
                    <th>Unit</th>
                    <th>Waste Factor</th>
                    <th>Line Cost</th>
                  </tr>
                </thead>
                <tbody>
                  {product.productSupplies.map((ps, index) => {
                    const unitCost = ps.costOverride
                      ? Number(ps.costOverride)
                      : Number(ps.supply.costPerUnit);
                    const qty = Number(ps.quantity);
                    const waste = Number(ps.wasteFactor);
                    const lineCost = unitCost * qty * waste;

                    return (
                      <tr key={index}>
                        <td>
                          <Link
                            href={`/dashboard/supplies/${ps.supply.id}`}
                            className="font-semibold hover:text-primary"
                          >
                            {ps.supply.name}
                          </Link>
                        </td>
                        <td>
                          <span className="badge badge-outline">
                            {ps.supply.category}
                          </span>
                        </td>
                        <td>{qty}</td>
                        <td>{ps.unit}</td>
                        <td>{waste}x</td>
                        <td>
                          <span className="font-semibold">
                            ${lineCost.toFixed(4)}
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </section>
        )}

        {/* Description */}
        {product.description && (
          <section className="space-y-4">
            <h2 className="text-xl font-semibold">Description</h2>
            <p className="whitespace-pre-line text-base-content/80">
              {product.description}
            </p>
          </section>
        )}
      </div>
    </>
  );
}
