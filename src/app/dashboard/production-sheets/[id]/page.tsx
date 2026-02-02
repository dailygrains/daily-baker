import { getCurrentUser } from '@/lib/clerk';
import { redirect } from 'next/navigation';
import { SetPageHeader } from '@/components/layout/SetPageHeader';
import { getProductionSheetById } from '@/app/actions/productionSheet';
import Link from 'next/link';
import { CheckCircle2, Clock, AlertTriangle } from 'lucide-react';
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
    <>
      <SetPageHeader
        title={`${productionSheet.quantity} of ${productionSheet.recipe.name}`}
        breadcrumbs={[
          { label: 'Production Sheets', href: '/dashboard/production-sheets' },
          { label: productionSheet.recipe.name },
        ]}
        actions={
          !productionSheet.completed && (
            <CompleteProductionSheetButton productionSheetId={id} />
          )
        }
      />

      <div className="space-y-8">
        {/* Overview Stats */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
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
          </div>

          <div>
            <p className="text-sm text-base-content/70">Est. Cost</p>
            <p className="text-2xl font-bold">${scaledCost.toFixed(2)}</p>
          </div>

          <div>
            <p className="text-sm text-base-content/70">
              {productionSheet.completed ? 'Completed' : 'Created'}
            </p>
            <p className="text-sm">
              {formatDistanceToNow(
                new Date(productionSheet.completed && productionSheet.completedAt
                  ? productionSheet.completedAt
                  : productionSheet.createdAt),
                { addSuffix: true }
              )}
            </p>
            {productionSheet.completed && productionSheet.completer && (
              <p className="text-sm text-base-content/60">
                by {productionSheet.completer.name || productionSheet.completer.email}
              </p>
            )}
          </div>
        </div>

        {productionSheet.notes && (
          <div>
            <p className="text-sm text-base-content/70">Notes</p>
            <p className="whitespace-pre-line text-base-content/80 mt-1">
              {productionSheet.notes}
            </p>
          </div>
        )}

        {/* Ingredient Requirements */}
        <section className="space-y-4">
          <div>
            <h2 className="text-xl font-semibold">Ingredient Requirements</h2>
            <p className="text-sm text-base-content/70">
              Quantities scaled by {scale.toFixed(2)}x
            </p>
          </div>

          {productionSheet.recipe.sections.map((section) => (
            <div key={section.id} className="space-y-2">
              <h3 className="font-semibold text-lg">{section.name}</h3>

              <div className="overflow-x-auto">
                <table className="table table-zebra">
                  <thead>
                    <tr>
                      <th>Ingredient</th>
                      <th>Required</th>
                      <th>Unit</th>
                    </tr>
                  </thead>
                  <tbody>
                    {section.ingredients.map((recipeIng) => {
                      const requiredQty = Number(recipeIng.quantity) * scale;

                      return (
                        <tr key={recipeIng.id} className="hover">
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
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              {section.instructions && (
                <div className="mt-2 p-4 bg-base-200 rounded-lg">
                  <p className="text-sm font-semibold mb-2">Instructions:</p>
                  <p className="text-sm whitespace-pre-line text-base-content/80">
                    {section.instructions}
                  </p>
                </div>
              )}
            </div>
          ))}
        </section>

        {/* Inventory Usages (if completed) */}
        {productionSheet.completed && productionSheet.usages && productionSheet.usages.length > 0 && (
          <section className="space-y-4">
            <div>
              <h2 className="text-xl font-semibold">Inventory Used</h2>
              <p className="text-sm text-base-content/70">
                Ingredients deducted (FIFO) when completed
              </p>
            </div>

            {/* Shortfall warning if any */}
            {productionSheet.usages.some((u) => Number(u.shortfall) > 0) && (
              <div className="alert alert-warning">
                <AlertTriangle className="h-5 w-5" />
                <span>Some ingredients had insufficient inventory when completed</span>
              </div>
            )}

            <div className="overflow-x-auto">
              <table className="table table-zebra">
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
          </section>
        )}
      </div>
    </>
  );
}
