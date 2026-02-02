import { getCurrentUser } from '@/lib/clerk';
import { redirect } from 'next/navigation';
import { SetPageHeader } from '@/components/layout/SetPageHeader';
import { getProductionSheetById } from '@/app/actions/productionSheet';
import Link from 'next/link';
import { CheckCircle2, Clock, AlertTriangle, Calendar, Edit } from 'lucide-react';
import { formatDistanceToNow, format } from 'date-fns';
import { CompleteProductionSheetButton } from '@/components/productionSheets/CompleteProductionSheetButton';
import { RecipeListTable } from '@/components/productionSheets/RecipeListTable';
import { ScaledIngredientsSection } from '@/components/productionSheets/ScaledIngredientsSection';
import { TotalIngredientsTable } from '@/components/productionSheets/TotalIngredientsTable';
import {
  calculateAllScaledIngredients,
  aggregateIngredients,
  type ProductionSheetRecipeEntry,
} from '@/lib/ingredientAggregation';

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

  // Build recipe entries for ingredient calculations
  const recipeEntries: ProductionSheetRecipeEntry[] = productionSheet.recipes.map((r) => ({
    id: r.id,
    scale: Number(r.scale),
    order: r.order,
    recipe: {
      id: r.recipe.id,
      name: r.recipe.name,
      yieldQty: r.recipe.yieldQty,
      yieldUnit: r.recipe.yieldUnit,
      totalCost: r.recipe.totalCost,
      sections: r.recipe.sections.map((s) => ({
        id: s.id,
        name: s.name,
        order: s.order,
        ingredients: s.ingredients.map((i) => ({
          id: i.id,
          quantity: i.quantity,
          unit: i.unit,
          ingredient: i.ingredient,
        })),
      })),
    },
  }));

  // Calculate scaled ingredients per recipe and aggregated totals
  const scaledRecipes = calculateAllScaledIngredients(recipeEntries);
  const aggregatedIngredients = aggregateIngredients(scaledRecipes);

  // Calculate total cost
  const totalCost = scaledRecipes.reduce((sum, r) => sum + r.estimatedCost, 0);

  // Get recipe names for display
  const recipeNames = productionSheet.recipes.map((r) => r.recipe.name).join(', ');

  // Prepare recipes for RecipeListTable
  const recipesForTable = productionSheet.recipes.map((r) => ({
    id: r.id,
    recipeId: r.recipeId,
    scale: Number(r.scale),
    order: r.order,
    recipe: {
      id: r.recipe.id,
      name: r.recipe.name,
      yieldQty: r.recipe.yieldQty,
      yieldUnit: r.recipe.yieldUnit,
      totalCost: Number(r.recipe.totalCost || 0),
    },
  }));

  return (
    <>
      <SetPageHeader
        title={productionSheet.description || recipeNames}
        breadcrumbs={[
          { label: 'Production Sheets', href: '/dashboard/production-sheets' },
          { label: productionSheet.description || recipeNames },
        ]}
        actions={
          !productionSheet.completed && (
            <div className="flex gap-2">
              <Link
                href={`/dashboard/production-sheets/${id}/edit`}
                className="btn btn-ghost"
              >
                <Edit className="h-4 w-4" />
                Edit
              </Link>
              <CompleteProductionSheetButton productionSheetId={id} />
            </div>
          )
        }
      />

      <div className="space-y-8">
        {/* Overview Stats */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
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
            <p className="text-sm text-base-content/70">Recipes</p>
            <p className="text-2xl font-bold">{productionSheet.recipes.length}</p>
          </div>

          <div>
            <p className="text-sm text-base-content/70">Est. Cost</p>
            <p className="text-2xl font-bold">${totalCost.toFixed(2)}</p>
          </div>

          <div>
            <p className="text-sm text-base-content/70">Scheduled</p>
            {productionSheet.scheduledFor ? (
              <div className="flex items-center gap-1 mt-1">
                <Calendar className="h-4 w-4 text-base-content/60" />
                <span>{format(new Date(productionSheet.scheduledFor), 'MMM d, h:mm a')}</span>
              </div>
            ) : (
              <p className="text-base-content/40 mt-1">Not scheduled</p>
            )}
          </div>

          <div>
            <p className="text-sm text-base-content/70">
              {productionSheet.completed ? 'Completed' : 'Created'}
            </p>
            <p className="text-sm mt-1">
              {formatDistanceToNow(
                new Date(
                  productionSheet.completed && productionSheet.completedAt
                    ? productionSheet.completedAt
                    : productionSheet.createdAt
                ),
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

        {/* Recipes Table */}
        <section className="space-y-4">
          <div>
            <h2 className="text-xl font-semibold">Recipes</h2>
            <p className="text-sm text-base-content/70">
              Recipes included in this production sheet
            </p>
          </div>
          <RecipeListTable recipes={recipesForTable} />
        </section>

        {/* Per-Recipe Ingredient Breakdown */}
        <section className="space-y-4">
          <div>
            <h2 className="text-xl font-semibold">Ingredient Breakdown by Recipe</h2>
            <p className="text-sm text-base-content/70">
              Scaled ingredient requirements for each recipe
            </p>
          </div>
          <ScaledIngredientsSection recipes={scaledRecipes} />
        </section>

        {/* Total Ingredients Aggregated */}
        <section className="space-y-4">
          <div>
            <h2 className="text-xl font-semibold">Total Ingredients Required</h2>
            <p className="text-sm text-base-content/70">
              Combined requirements across all recipes (click to expand recipe breakdown)
            </p>
          </div>
          <TotalIngredientsTable ingredients={aggregatedIngredients} />
        </section>

        {/* Inventory Usages (if completed) */}
        {productionSheet.completed &&
          productionSheet.usages &&
          productionSheet.usages.length > 0 && (
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
                        <tr
                          key={usage.id}
                          className={hasShortfall ? 'bg-warning/10' : ''}
                        >
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
                            {formatDistanceToNow(new Date(usage.lot.purchasedAt), {
                              addSuffix: true,
                            })}
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
