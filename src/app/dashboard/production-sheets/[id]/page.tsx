import { getCurrentUser } from '@/lib/clerk';
import { redirect } from 'next/navigation';
import { PageHeader } from '@/components/ui/PageHeader';
import { getProductionSheetById } from '@/app/actions/productionSheet';
import Link from 'next/link';
import { CheckCircle2, Package, Clock, AlertTriangle } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { CompleteProductionSheetButton } from '@/components/productionSheets/CompleteProductionSheetButton';

export default async function ProductionSheetDetailPage({
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

  const productionSheetResult = await getProductionSheetById(id);

  if (!productionSheetResult.success || !productionSheetResult.data) {
    redirect('/dashboard/production-sheets');
  }

  const productionSheet = productionSheetResult.data;
  const scale = Number(productionSheet.scale);
  const recipeTotalCost = Number(productionSheet.recipe.totalCost || 0);
  const scaledCost = recipeTotalCost * scale;

  return (
    <div className="space-y-6">
        <PageHeader
          title={`${productionSheet.quantity} of ${productionSheet.recipe.name}`}
          description={`Production sheet details${productionSheet.completed ? ' (Completed)' : ''}`}
          actions={
            !productionSheet.completed && (
              <CompleteProductionSheetButton productionSheetId={id} />
            )
          }
        />

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main Info Card */}
          <div className="lg:col-span-2 card bg-base-100 shadow-xl">
            <div className="card-body">
              <h2 className="card-title">Production Sheet Information</h2>

              <div className="grid grid-cols-2 gap-4 mt-4">
                <div>
                  <p className="text-sm text-base-content/70">Status</p>
                  {productionSheet.completed ? (
                    <span className="badge badge-success badge-lg mt-1 gap-2">
                      <CheckCircle2 className="h-4 w-4" />
                      Completed
                    </span>
                  ) : (
                    <span className="badge badge-warning badge-lg mt-1 gap-2">
                      <Clock className="h-4 w-4" />
                      Pending
                    </span>
                  )}
                </div>

                <div>
                  <p className="text-sm text-base-content/70">Recipe</p>
                  <Link
                    href={`/dashboard/recipes/${productionSheet.recipe.id}`}
                    className="text-lg font-semibold hover:text-primary"
                  >
                    {productionSheet.recipe.name}
                  </Link>
                </div>

                <div>
                  <p className="text-sm text-base-content/70">Quantity</p>
                  <p className="text-2xl font-bold">{productionSheet.quantity}</p>
                </div>

                <div>
                  <p className="text-sm text-base-content/70">Scale</p>
                  <p className="text-2xl font-bold">{scale.toFixed(2)}x</p>
                  <p className="text-sm text-base-content/60 mt-1">
                    {scale === 1 ? 'Recipe as-is' : scale > 1 ? 'Scaled up' : 'Scaled down'}
                  </p>
                </div>

                {productionSheet.completed && productionSheet.completedAt && (
                  <>
                    <div>
                      <p className="text-sm text-base-content/70">Completed</p>
                      <p className="text-lg">
                        {formatDistanceToNow(new Date(productionSheet.completedAt), {
                          addSuffix: true,
                        })}
                      </p>
                    </div>

                    {productionSheet.completer && (
                      <div>
                        <p className="text-sm text-base-content/70">Completed By</p>
                        <p className="text-lg font-semibold">
                          {productionSheet.completer.name || productionSheet.completer.email}
                        </p>
                      </div>
                    )}
                  </>
                )}

                {!productionSheet.completed && (
                  <div>
                    <p className="text-sm text-base-content/70">Created</p>
                    <p className="text-lg">
                      {formatDistanceToNow(new Date(productionSheet.createdAt), {
                        addSuffix: true,
                      })}
                    </p>
                  </div>
                )}
              </div>

              {productionSheet.notes && (
                <div className="mt-4 pt-4 border-t border-base-300">
                  <p className="text-sm text-base-content/70 mb-2">Notes</p>
                  <p className="whitespace-pre-line text-base-content/80">
                    {productionSheet.notes}
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* Stats Card */}
          <div className="space-y-4">
            <div className="stats stats-vertical shadow">
              <div className="stat">
                <div className="stat-figure text-primary">
                  <Package className="h-8 w-8" />
                </div>
                <div className="stat-title">Scale</div>
                <div className="stat-value text-primary">{scale.toFixed(1)}x</div>
                <div className="stat-desc">Recipe multiplier</div>
              </div>

              <div className="stat">
                <div className="stat-figure text-secondary">
                  <span className="text-2xl">$</span>
                </div>
                <div className="stat-title">Estimated Cost</div>
                <div className="stat-value text-secondary">
                  ${scaledCost.toFixed(2)}
                </div>
                <div className="stat-desc">
                  ${recipeTotalCost.toFixed(2)} × {scale.toFixed(2)}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Ingredient Requirements */}
        <div className="card bg-base-100 shadow-xl">
          <div className="card-body">
            <h2 className="card-title">Ingredient Requirements</h2>
            <p className="text-sm text-base-content/70 mb-4">
              Quantities shown are scaled by {scale.toFixed(2)}x
            </p>

            {productionSheet.recipe.sections.map((section) => (
              <div key={section.id} className="mb-6 last:mb-0">
                <h3 className="font-semibold text-lg mb-2">{section.name}</h3>

                <div className="overflow-x-auto">
                  <table className="table table-zebra">
                    <thead>
                      <tr>
                        <th>Ingredient</th>
                        <th>Required</th>
                        <th>Unit</th>
                        <th>Stock</th>
                      </tr>
                    </thead>
                    <tbody>
                      {section.ingredients.map((recipeIng) => {
                        const requiredQty = Number(recipeIng.quantity) * scale;

                        return (
                          <tr key={recipeIng.id}>
                            <td>
                              <Link
                                href={`/dashboard/ingredients/${recipeIng.ingredient.id}`}
                                className="font-semibold hover:text-primary"
                              >
                                {recipeIng.ingredient.name}
                              </Link>
                            </td>
                            <td className="font-mono">
                              {requiredQty.toFixed(3)} {recipeIng.unit}
                            </td>
                            <td className="font-mono">
                              {recipeIng.ingredient.unit}
                            </td>
                            <td>
                              <Link
                                href={`/dashboard/ingredients/${recipeIng.ingredient.id}`}
                                className="btn btn-ghost btn-xs"
                              >
                                View Stock
                              </Link>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>

                {section.instructions && (
                  <div className="mt-4 p-4 bg-base-200 rounded-lg">
                    <p className="text-sm font-semibold mb-2">Instructions:</p>
                    <p className="text-sm whitespace-pre-line text-base-content/80">
                      {section.instructions}
                    </p>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Inventory Usages (if completed) */}
        {productionSheet.completed && productionSheet.usages && productionSheet.usages.length > 0 && (
          <div className="card bg-base-100 shadow-xl">
            <div className="card-body">
              <h2 className="card-title">Inventory Used</h2>
              <p className="text-sm text-base-content/70 mb-4">
                Ingredients deducted (FIFO) when this production sheet was completed
              </p>

              {/* Shortfall warning if any */}
              {productionSheet.usages.some((u) => Number(u.shortfall) > 0) && (
                <div className="alert alert-warning mb-4">
                  <AlertTriangle className="h-5 w-5" />
                  <span>Some ingredients had insufficient inventory when this production sheet was completed</span>
                </div>
              )}

              <div className="overflow-x-auto">
                <table className="table">
                  <thead>
                    <tr>
                      <th>Ingredient</th>
                      <th>Quantity Used</th>
                      <th>Shortfall</th>
                      <th>From Lot</th>
                      <th>Notes</th>
                    </tr>
                  </thead>
                  <tbody>
                    {productionSheet.usages.map((usage) => {
                      const hasShortfall = Number(usage.shortfall) > 0;
                      return (
                        <tr key={usage.id} className={hasShortfall ? 'bg-warning/10' : ''}>
                          <td>
                            <Link
                              href={`/dashboard/ingredients/${usage.lot.inventory.ingredient.id}`}
                              className="hover:text-primary"
                            >
                              {usage.lot.inventory.ingredient.name}
                            </Link>
                          </td>
                          <td className="font-mono">
                            {Number(usage.quantity).toFixed(3)} {usage.lot.purchaseUnit}
                          </td>
                          <td>
                            {hasShortfall ? (
                              <span className="badge badge-warning gap-1">
                                <AlertTriangle className="h-3 w-3" />
                                {Number(usage.shortfall).toFixed(3)} {usage.lot.purchaseUnit}
                              </span>
                            ) : (
                              <span className="text-base-content/50">-</span>
                            )}
                          </td>
                          <td className="text-sm text-base-content/70">
                            {formatDistanceToNow(new Date(usage.lot.purchasedAt), { addSuffix: true })}
                          </td>
                          <td className="text-sm text-base-content/70">
                            {usage.notes || '-'}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}
      </div>
  );
}
