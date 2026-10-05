import { getCurrentUser } from '@/lib/clerk';
import { redirect } from 'next/navigation';
import { SetPageHeader } from '@/components/layout/SetPageHeader';
import { getProductsByBakery } from '@/app/actions/product';
import Link from 'next/link';
import { Plus } from 'lucide-react';

export default async function ProductsPage() {
  const user = await getCurrentUser();

  if (!user) {
    redirect('/sign-in');
  }

  if (!user.bakeryId) {
    redirect('/dashboard');
  }

  const productsResult = await getProductsByBakery(user.bakeryId);

  if (!productsResult.success) {
    return (
      <div className="alert alert-error">
        <span>{productsResult.error}</span>
      </div>
    );
  }

  const products = productsResult.data || [];
  const totalProducts = products.length;

  // Stats are variation-level: a variation is the thing that carries a cost
  // and a price, so a two-size product contributes two data points.
  const allVariations = products.flatMap((p) => p.variations);

  const avgCost =
    allVariations.length > 0
      ? allVariations.reduce((sum, v) => sum + Number(v.totalCost), 0) / allVariations.length
      : 0;

  const withRetail = allVariations.filter((v) => v.retailPrice !== null);

  const avgMargin =
    withRetail.length > 0
      ? withRetail.reduce((sum, v) => {
          const retail = Number(v.retailPrice);
          const cost = Number(v.totalCost);
          return sum + ((retail - cost) / retail) * 100;
        }, 0) / withRetail.length
      : null;

  const totalRevenuePotential = allVariations
    .filter((v) => v.retailPrice !== null && v.isActive)
    .reduce((sum, v) => sum + Number(v.retailPrice), 0);

  return (
    <div className="space-y-6">
      <SetPageHeader
        title="Products"
        description="Manage sellable products with full cost breakdown"
        actions={
          <Link href="/dashboard/products/new" className="btn btn-primary">
            <Plus className="h-4 w-4" />
            Add Product
          </Link>
        }
      />

      {/* Stats */}
      <div className="card bg-base-100 p-4">
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <div>
            <p className="text-sm text-base-content/70">Total Products</p>
            <p className="text-2xl font-bold text-primary">{totalProducts}</p>
          </div>
          <div>
            <p className="text-sm text-base-content/70">Average Cost</p>
            <p className="text-2xl font-bold">${avgCost.toFixed(2)}</p>
          </div>
          <div>
            <p className="text-sm text-base-content/70">Average Margin</p>
            <p className="text-2xl font-bold text-success">
              {avgMargin !== null ? `${avgMargin.toFixed(1)}%` : '-'}
            </p>
          </div>
          <div>
            <p className="text-sm text-base-content/70">Total Revenue Potential</p>
            <p className="text-2xl font-bold text-success">
              ${totalRevenuePotential.toFixed(2)}
            </p>
          </div>
        </div>
      </div>

      {/* Products List */}
      {products.length === 0 ? (
        <div className="text-center py-12">
          <h3 className="text-2xl font-bold mb-2">No products yet</h3>
          <p className="text-base-content/70 mb-6">
            Start creating products to track true costs and margins
          </p>
          <Link href="/dashboard/products/new" className="btn btn-primary">
            <Plus className="h-4 w-4" />
            Add Your First Product
          </Link>
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="table table-zebra table-lg">
            <thead>
              <tr>
                <th>Name</th>
                <th>Recipe</th>
                <th>Variations</th>
                <th>Total Cost</th>
                <th>Retail Price</th>
                <th>Margin %</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {products.map((product) => {
                // A product spans several variations, so show the range its
                // sizes cover rather than a single number.
                const costs = product.variations.map((v) => Number(v.totalCost));
                const retails = product.variations
                  .filter((v) => v.retailPrice !== null)
                  .map((v) => Number(v.retailPrice));

                const formatRange = (values: number[], prefix = '$') => {
                  if (values.length === 0) return '-';
                  const min = Math.min(...values);
                  const max = Math.max(...values);
                  return min === max
                    ? `${prefix}${min.toFixed(2)}`
                    : `${prefix}${min.toFixed(2)} - ${prefix}${max.toFixed(2)}`;
                };

                const margins = product.variations
                  .filter((v) => v.retailPrice !== null && Number(v.retailPrice) > 0)
                  .map((v) => {
                    const retail = Number(v.retailPrice);
                    return ((retail - Number(v.totalCost)) / retail) * 100;
                  });
                const minMargin = margins.length > 0 ? Math.min(...margins) : null;

                return (
                  <tr key={product.id}>
                    <td>
                      <Link
                        href={`/dashboard/products/${product.id}`}
                        className="font-semibold hover:text-primary"
                      >
                        {product.name}
                      </Link>
                      {!product.isActive && (
                        <span className="badge badge-ghost badge-sm ml-2">Inactive</span>
                      )}
                    </td>
                    <td>
                      {product.recipe ? (
                        <Link
                          href={`/dashboard/recipes/${product.recipe.id}`}
                          className="link link-hover"
                        >
                          {product.recipe.name}
                        </Link>
                      ) : (
                        <span className="text-base-content/50">No recipe</span>
                      )}
                    </td>
                    <td>
                      <span className="badge badge-outline">
                        {product._count.variations}
                      </span>
                      <p className="text-sm text-base-content/50">
                        {product.variations.map((v) => v.name).join(', ')}
                      </p>
                    </td>
                    <td>
                      <span className="font-semibold">{formatRange(costs)}</span>
                    </td>
                    <td>
                      <span className="font-semibold">{formatRange(retails)}</span>
                    </td>
                    <td>
                      {minMargin !== null ? (
                        <span
                          className={`font-semibold ${minMargin < 0 ? 'text-error' : 'text-success'}`}
                        >
                          {minMargin.toFixed(1)}%
                        </span>
                      ) : (
                        '-'
                      )}
                    </td>
                    <td>
                      <Link
                        href={`/dashboard/products/${product.id}/edit`}
                        className="btn btn-ghost btn-xs"
                      >
                        Edit
                      </Link>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
