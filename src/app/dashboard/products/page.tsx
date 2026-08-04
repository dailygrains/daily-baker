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

  const avgCost =
    totalProducts > 0
      ? products.reduce((sum, p) => sum + Number(p.totalCost), 0) / totalProducts
      : 0;

  // Products with retail price for margin/revenue calcs
  const withRetail = products.filter((p) => p.retailPrice !== null);

  const avgMargin =
    withRetail.length > 0
      ? withRetail.reduce((sum, p) => {
          const retail = Number(p.retailPrice);
          const cost = Number(p.totalCost);
          return sum + ((retail - cost) / retail) * 100;
        }, 0) / withRetail.length
      : null;

  const totalRevenuePotential = products
    .filter((p) => p.retailPrice !== null && p.isActive)
    .reduce((sum, p) => sum + Number(p.retailPrice), 0);

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
                <th>Total Cost</th>
                <th>Retail Price</th>
                <th>Margin %</th>
                <th>Supply Count</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {products.map((product) => {
                const totalCost = Number(product.totalCost);
                const retailPrice = product.retailPrice
                  ? Number(product.retailPrice)
                  : null;
                const margin =
                  retailPrice && retailPrice > 0
                    ? ((retailPrice - totalCost) / retailPrice) * 100
                    : null;

                return (
                  <tr key={product.id}>
                    <td>
                      <Link
                        href={`/dashboard/products/${product.id}`}
                        className="font-semibold hover:text-primary"
                      >
                        {product.name}
                      </Link>
                      {product.sku && (
                        <p className="text-sm text-base-content/50">
                          SKU: {product.sku}
                        </p>
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
                      <span className="font-semibold">
                        ${totalCost.toFixed(2)}
                      </span>
                    </td>
                    <td>
                      {retailPrice !== null ? (
                        <span className="font-semibold">
                          ${retailPrice.toFixed(2)}
                        </span>
                      ) : (
                        '-'
                      )}
                    </td>
                    <td>
                      {margin !== null ? (
                        <span
                          className={`font-semibold ${margin < 0 ? 'text-error' : 'text-success'}`}
                        >
                          {margin.toFixed(1)}%
                        </span>
                      ) : (
                        '-'
                      )}
                    </td>
                    <td>{product._count.productSupplies}</td>
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
