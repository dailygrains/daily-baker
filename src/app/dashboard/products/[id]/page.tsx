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

  const recipeScale = Number(product.recipeScale);

  const variations = product.variations.map((v) => {
    const totalCost = Number(v.totalCost);
    const retailPrice = v.retailPrice != null ? Number(v.retailPrice) : null;
    return {
      id: v.id,
      name: v.name,
      sku: v.sku,
      isActive: v.isActive,
      unitWeightG: v.unitWeightG != null ? Number(v.unitWeightG) : null,
      batchYieldQty: v.batchYieldQty,
      ingredientCost: Number(v.ingredientCost),
      supplyCost: Number(v.supplyCost),
      laborCost: Number(v.laborCost),
      overheadCost: Number(v.overheadCost),
      totalCost,
      retailPrice,
      wholesalePrice: v.wholesalePrice != null ? Number(v.wholesalePrice) : null,
      targetMarginPct: v.targetMarginPct != null ? Number(v.targetMarginPct) : null,
      margin:
        retailPrice && retailPrice > 0 ? ((retailPrice - totalCost) / retailPrice) * 100 : null,
      variationSupplies: v.variationSupplies,
    };
  });

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
              <p className="text-sm text-base-content/70">Square Item ID</p>
              <p className="text-lg font-semibold font-mono break-all">
                {product.squareItemId ?? '-'}
              </p>
            </div>
          </div>
        </section>

        {/* Variations */}
        <section className="space-y-4">
          <h2 className="text-xl font-semibold">
            Variations <span className="text-base-content/60">({variations.length})</span>
          </h2>

          {variations.map((v) => (
            <div key={v.id} className="card bg-base-100 p-4 space-y-4">
              <div className="flex items-center gap-3 flex-wrap">
                <h3 className="text-lg font-semibold">{v.name}</h3>
                {!v.isActive && <span className="badge badge-ghost">Inactive</span>}
                {v.sku && <span className="badge badge-outline">SKU {v.sku}</span>}
                {v.unitWeightG != null && (
                  <span className="badge badge-outline">{v.unitWeightG.toFixed(0)}g</span>
                )}
                {v.unitWeightG == null && v.batchYieldQty != null && (
                  <span className="badge badge-outline">{v.batchYieldQty} per batch</span>
                )}
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
                <div>
                  <p className="text-sm text-base-content/70">Ingredient</p>
                  <p className="text-xl font-bold">${v.ingredientCost.toFixed(4)}</p>
                </div>
                <div>
                  <p className="text-sm text-base-content/70">Supply</p>
                  <p className="text-xl font-bold">${v.supplyCost.toFixed(4)}</p>
                </div>
                <div>
                  <p className="text-sm text-base-content/70">Labor</p>
                  <p className="text-xl font-bold">${v.laborCost.toFixed(4)}</p>
                </div>
                <div>
                  <p className="text-sm text-base-content/70">Overhead</p>
                  <p className="text-xl font-bold">${v.overheadCost.toFixed(4)}</p>
                </div>
                <div>
                  <p className="text-sm text-base-content/70">Total Cost</p>
                  <p className="text-xl font-bold text-primary">${v.totalCost.toFixed(4)}</p>
                </div>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                <div>
                  <p className="text-sm text-base-content/70">Retail</p>
                  <p className="text-xl font-bold">
                    {v.retailPrice !== null ? `$${v.retailPrice.toFixed(2)}` : '-'}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-base-content/70">Wholesale</p>
                  <p className="text-xl font-bold">
                    {v.wholesalePrice !== null ? `$${v.wholesalePrice.toFixed(2)}` : '-'}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-base-content/70">Margin</p>
                  <p
                    className={`text-xl font-bold ${v.margin !== null && v.margin < 0 ? 'text-error' : 'text-success'}`}
                  >
                    {v.margin !== null ? `${v.margin.toFixed(1)}%` : '-'}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-base-content/70">Target Margin</p>
                  <p className="text-xl font-bold">
                    {v.targetMarginPct !== null ? `${v.targetMarginPct.toFixed(1)}%` : '-'}
                  </p>
                </div>
              </div>

              {v.variationSupplies.length > 0 && (
                <div className="overflow-x-auto">
                  <table className="table table-zebra table-sm">
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
                      {v.variationSupplies.map((ps) => {
                        const unitCost =
                          ps.costOverride != null
                            ? Number(ps.costOverride)
                            : Number(ps.supply.costPerUnit);
                        const qty = Number(ps.quantity);
                        const waste = Number(ps.wasteFactor);
                        const lineCost = unitCost * qty * waste;

                        return (
                          <tr key={ps.id}>
                            <td>
                              <Link
                                href={`/dashboard/supplies/${ps.supply.id}`}
                                className="font-semibold hover:text-primary"
                              >
                                {ps.supply.name}
                              </Link>
                            </td>
                            <td>
                              <span className="badge badge-outline">{ps.supply.category}</span>
                            </td>
                            <td>{qty}</td>
                            <td>{ps.unit}</td>
                            <td>{waste}x</td>
                            <td>
                              <span className="font-semibold">${lineCost.toFixed(4)}</span>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          ))}
        </section>

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
