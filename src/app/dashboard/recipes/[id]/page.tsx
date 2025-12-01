import { getCurrentUser } from '@/lib/clerk';
import { redirect } from 'next/navigation';
import { PageHeader } from '@/components/ui/PageHeader';
import { getRecipeById } from '@/app/actions/recipe';
import Link from 'next/link';
import { Edit, DollarSign, Layers, ClipboardList, Package } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';

export default async function RecipeDetailPage({
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

  const recipeResult = await getRecipeById(id);

  if (!recipeResult.success || !recipeResult.data) {
    redirect('/dashboard/recipes');
  }

  const recipe = recipeResult.data;
  const totalCost = Number(recipe.totalCost);

  // Calculate cost per unit
  const yieldMatch = recipe.yield.match(/(\d+)/);
  const yieldNum = yieldMatch ? parseInt(yieldMatch[1]) : 1;
  const costPerUnit = yieldNum > 0 ? (totalCost / yieldNum).toFixed(2) : '0.00';

  return (
    <div className="space-y-6">
        <PageHeader
          title={recipe.name}
          description={recipe.description || 'Recipe details and instructions'}
          actions={
            <Link
              href={`/dashboard/recipes/${id}/edit`}
              className="btn btn-primary btn-sm"
            >
              <Edit className="h-4 w-4" />
              Edit
            </Link>
          }
        />

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main Info Card */}
          <div className="lg:col-span-2 space-y-6">
            {/* Recipe Info */}
            <div className="card bg-base-100 shadow-xl">
              <div className="card-body">
                <h2 className="card-title">Recipe Information</h2>

                <div className="grid grid-cols-2 gap-4 mt-4">
                  <div>
                    <p className="text-sm text-base-content/70">Yield</p>
                    <p className="text-2xl font-bold">{recipe.yield}</p>
                  </div>

                  <div>
                    <p className="text-sm text-base-content/70">Total Cost</p>
                    <p className="text-2xl font-bold text-success">
                      ${totalCost.toFixed(2)}
                    </p>
                  </div>

                  <div>
                    <p className="text-sm text-base-content/70">Cost per Unit</p>
                    <p className="text-lg font-semibold">${costPerUnit}</p>
                  </div>

                  <div>
                    <p className="text-sm text-base-content/70">Last Updated</p>
                    <p className="text-sm">
                      {formatDistanceToNow(new Date(recipe.updatedAt), {
                        addSuffix: true,
                      })}
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Recipe Sections */}
            {recipe.sections.map((section, index) => (
              <div key={section.id} className="card bg-base-100 shadow-xl">
                <div className="card-body">
                  <div className="flex items-center gap-2">
                    <span className="badge badge-primary">{index + 1}</span>
                    <h2 className="card-title">{section.name}</h2>
                  </div>

                  {/* Ingredients */}
                  {section.ingredients.length > 0 && (
                    <div className="mt-4">
                      <h3 className="font-semibold mb-2">Ingredients</h3>
                      <div className="overflow-x-auto">
                        <table className="table table-sm">
                          <thead>
                            <tr>
                              <th>Ingredient</th>
                              <th>Quantity</th>
                              <th>Unit Cost</th>
                              <th>Total Cost</th>
                            </tr>
                          </thead>
                          <tbody>
                            {section.ingredients.map((ing) => {
                              const quantity = Number(ing.quantity);
                              const costPerUnit = Number(ing.ingredient.costPerUnit);
                              const totalIngredientCost = quantity * costPerUnit;

                              return (
                                <tr key={ing.id}>
                                  <td>
                                    <Link
                                      href={`/dashboard/ingredients/${ing.ingredient.id}`}
                                      className="link link-hover"
                                    >
                                      {ing.ingredient.name}
                                    </Link>
                                  </td>
                                  <td>
                                    {quantity.toFixed(3)} {ing.unit}
                                  </td>
                                  <td>${costPerUnit.toFixed(2)}</td>
                                  <td className="font-semibold">
                                    ${totalIngredientCost.toFixed(2)}
                                  </td>
                                </tr>
                              );
                            })}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  )}

                  {/* Instructions */}
                  {section.instructions && (
                    <div className="mt-4">
                      <h3 className="font-semibold mb-2">Instructions</h3>
                      <div className="prose prose-sm max-w-none">
                        <p className="whitespace-pre-line text-base-content/80">
                          {section.instructions}
                        </p>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>

          {/* Stats Card */}
          <div className="space-y-4">
            <div className="stats stats-vertical shadow">
              <div className="stat">
                <div className="stat-figure text-primary">
                  <Layers className="h-8 w-8" />
                </div>
                <div className="stat-title">Sections</div>
                <div className="stat-value text-primary">{recipe._count.sections}</div>
                <div className="stat-desc">Recipe sections</div>
              </div>

              <div className="stat">
                <div className="stat-figure text-secondary">
                  <DollarSign className="h-8 w-8" />
                </div>
                <div className="stat-title">Total Cost</div>
                <div className="stat-value text-secondary">
                  ${totalCost.toFixed(2)}
                </div>
                <div className="stat-desc">Ingredient cost</div>
              </div>

              <div className="stat">
                <div className="stat-figure text-accent">
                  <ClipboardList className="h-8 w-8" />
                </div>
                <div className="stat-title">Bake Sheets</div>
                <div className="stat-value text-accent">
                  {recipe._count.bakeSheets}
                </div>
                <div className="stat-desc">Times used</div>
              </div>
            </div>

            {/* Ingredient Summary */}
            <div className="card bg-base-100 shadow">
              <div className="card-body">
                <h3 className="card-title text-sm">
                  <Package className="h-4 w-4" />
                  Total Ingredients
                </h3>
                <p className="text-3xl font-bold">
                  {recipe.sections.reduce(
                    (sum, section) => sum + section.ingredients.length,
                    0
                  )}
                </p>
                <p className="text-sm text-base-content/70">
                  Across {recipe.sections.length} section(s)
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
  );
}
