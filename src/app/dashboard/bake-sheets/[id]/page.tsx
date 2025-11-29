import { getCurrentUser } from '@/lib/clerk';
import { redirect } from 'next/navigation';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { PageHeader } from '@/components/ui/PageHeader';
import { getBakeSheetById, completeBakeSheet } from '@/app/actions/bakeSheet';
import Link from 'next/link';
import { CheckCircle2, Package, Clock, User } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { CompleteBakeSheetButton } from '@/components/bakeSheets/CompleteBakeSheetButton';

export default async function BakeSheetDetailPage({
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

  const bakeSheetResult = await getBakeSheetById(id);

  if (!bakeSheetResult.success || !bakeSheetResult.data) {
    redirect('/dashboard/bake-sheets');
  }

  const bakeSheet = bakeSheetResult.data;
  const scale = Number(bakeSheet.scale);
  const recipeTotalCost = Number(bakeSheet.recipe.totalCost || 0);
  const scaledCost = recipeTotalCost * scale;

  return (
    <DashboardLayout isPlatformAdmin={user.isPlatformAdmin}>
      <div className="space-y-6">
        <PageHeader
          title={`${bakeSheet.quantity} of ${bakeSheet.recipe.name}`}
          description={`Bake sheet details${bakeSheet.completed ? ' (Completed)' : ''}`}
          actions={
            !bakeSheet.completed && (
              <CompleteBakeSheetButton bakeSheetId={id} />
            )
          }
        />

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main Info Card */}
          <div className="lg:col-span-2 card bg-base-100 shadow-xl">
            <div className="card-body">
              <h2 className="card-title">Bake Sheet Information</h2>

              <div className="grid grid-cols-2 gap-4 mt-4">
                <div>
                  <p className="text-sm text-base-content/70">Status</p>
                  {bakeSheet.completed ? (
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
                    href={`/dashboard/recipes/${bakeSheet.recipe.id}`}
                    className="text-lg font-semibold hover:text-primary"
                  >
                    {bakeSheet.recipe.name}
                  </Link>
                </div>

                <div>
                  <p className="text-sm text-base-content/70">Quantity</p>
                  <p className="text-2xl font-bold">{bakeSheet.quantity}</p>
                </div>

                <div>
                  <p className="text-sm text-base-content/70">Scale</p>
                  <p className="text-2xl font-bold">{scale.toFixed(2)}x</p>
                  <p className="text-sm text-base-content/60 mt-1">
                    {scale === 1 ? 'Recipe as-is' : scale > 1 ? 'Scaled up' : 'Scaled down'}
                  </p>
                </div>

                {bakeSheet.completed && bakeSheet.completedAt && (
                  <>
                    <div>
                      <p className="text-sm text-base-content/70">Completed</p>
                      <p className="text-lg">
                        {formatDistanceToNow(new Date(bakeSheet.completedAt), {
                          addSuffix: true,
                        })}
                      </p>
                    </div>

                    {bakeSheet.completer && (
                      <div>
                        <p className="text-sm text-base-content/70">Completed By</p>
                        <p className="text-lg font-semibold">
                          {bakeSheet.completer.name || bakeSheet.completer.email}
                        </p>
                      </div>
                    )}
                  </>
                )}

                {!bakeSheet.completed && (
                  <div>
                    <p className="text-sm text-base-content/70">Created</p>
                    <p className="text-lg">
                      {formatDistanceToNow(new Date(bakeSheet.createdAt), {
                        addSuffix: true,
                      })}
                    </p>
                  </div>
                )}
              </div>

              {bakeSheet.notes && (
                <div className="mt-4 pt-4 border-t border-base-300">
                  <p className="text-sm text-base-content/70 mb-2">Notes</p>
                  <p className="whitespace-pre-line text-base-content/80">
                    {bakeSheet.notes}
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

            {bakeSheet.recipe.sections.map((section) => (
              <div key={section.id} className="mb-6 last:mb-0">
                <h3 className="font-semibold text-lg mb-2">{section.name}</h3>

                <div className="overflow-x-auto">
                  <table className="table table-zebra">
                    <thead>
                      <tr>
                        <th>Ingredient</th>
                        <th>Required</th>
                        <th>Available</th>
                        <th>Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {section.ingredients.map((recipeIng) => {
                        const requiredQty = Number(recipeIng.quantity) * scale;
                        const availableQty = Number(recipeIng.ingredient.currentQty);
                        const hasSufficient = availableQty >= requiredQty;

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
                              {availableQty.toFixed(3)} {recipeIng.ingredient.unit}
                            </td>
                            <td>
                              {hasSufficient ? (
                                <span className="badge badge-success">OK</span>
                              ) : (
                                <span className="badge badge-error">Insufficient</span>
                              )}
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

        {/* Inventory Transactions (if completed) */}
        {bakeSheet.completed && bakeSheet.transactions.length > 0 && (
          <div className="card bg-base-100 shadow-xl">
            <div className="card-body">
              <h2 className="card-title">Inventory Transactions</h2>
              <p className="text-sm text-base-content/70 mb-4">
                Ingredients deducted when this bake sheet was completed
              </p>

              <div className="overflow-x-auto">
                <table className="table">
                  <thead>
                    <tr>
                      <th>Ingredient</th>
                      <th>Quantity Used</th>
                      <th>Notes</th>
                    </tr>
                  </thead>
                  <tbody>
                    {bakeSheet.transactions.map((transaction) => (
                      <tr key={transaction.id}>
                        <td>
                          <Link
                            href={`/dashboard/ingredients/${transaction.ingredient.id}`}
                            className="hover:text-primary"
                          >
                            {transaction.ingredient.name}
                          </Link>
                        </td>
                        <td className="font-mono">
                          {Number(transaction.quantity).toFixed(3)} {transaction.unit}
                        </td>
                        <td className="text-sm text-base-content/70">
                          {transaction.notes || '-'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
