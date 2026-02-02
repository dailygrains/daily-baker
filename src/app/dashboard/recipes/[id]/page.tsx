import { getCurrentUser } from '@/lib/clerk';
import { redirect } from 'next/navigation';
import { SetPageHeader } from '@/components/layout/SetPageHeader';
import { MarkdownViewer } from '@/components/ui/MarkdownViewer';
import { getRecipeById } from '@/app/actions/recipe';
import Link from 'next/link';
import { formatDistanceToNow } from 'date-fns';
import { calculateIngredientCost, formatUnit } from '@/lib/unitConvert';
import { formatQuantity, formatCurrency } from '@/lib/format';

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

  // Calculate total cost on-the-fly from ingredients with proper unit conversion
  const totalCost = recipe.sections.reduce((sectionSum, section) => {
    return sectionSum + section.ingredients.reduce((ingSum, ing) => {
      const cost = calculateIngredientCost(
        Number(ing.quantity),
        ing.unit,
        Number(ing.ingredient.costPerUnit),
        ing.ingredient.unit
      );
      return ingSum + (cost ?? 0);
    }, 0);
  }, 0);

  // Calculate cost per unit
  const costPerUnit = recipe.yieldQty > 0 ? totalCost / recipe.yieldQty : 0;

  // Count total ingredients
  const totalIngredients = recipe.sections.reduce(
    (sum, section) => sum + section.ingredients.length,
    0
  );

  return (
    <>
      <SetPageHeader
        title={recipe.name}
        sticky
        breadcrumbs={[
          { label: 'Recipes', href: '/dashboard/recipes' },
          { label: recipe.name },
        ]}
        actions={
          <Link
            href={`/dashboard/recipes/${id}/edit`}
            className="btn btn-primary"
          >
            Edit
          </Link>
        }
      />

      <div className="space-y-8">
        {/* Overview Stats */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
          <div>
            <p className="text-sm text-base-content/70">Yield</p>
            <p className="text-2xl font-bold">{recipe.yieldQty} {recipe.yieldUnit}</p>
          </div>

          <div>
            <p className="text-sm text-base-content/70">Total Cost</p>
            <p className="text-2xl font-bold text-success">{formatCurrency(totalCost)}</p>
          </div>

          <div>
            <p className="text-sm text-base-content/70">Cost per Unit</p>
            <p className="text-2xl font-bold">{formatCurrency(costPerUnit)}</p>
          </div>

          <div>
            <p className="text-sm text-base-content/70">Sections</p>
            <p className="text-2xl font-bold">{recipe._count.sections}</p>
          </div>

          <div>
            <p className="text-sm text-base-content/70">Ingredients</p>
            <p className="text-2xl font-bold">{totalIngredients}</p>
          </div>

          <div>
            <p className="text-sm text-base-content/70">Production Sheets</p>
            <p className="text-2xl font-bold">{recipe._count.productionSheetRecipes}</p>
          </div>
        </div>

        {/* Recipe Sections */}
        {recipe.sections.map((section, index) => (
          <section key={section.id} className="space-y-4">
            <div className="flex items-center gap-2">
              <span className="badge badge-primary">{index + 1}</span>
              <h2 className="text-xl font-semibold">{section.name}</h2>
            </div>

            {/* Ingredients */}
            {section.ingredients.length > 0 && (
              <div>
                <h3 className="font-semibold mb-2 text-base-content/70">Ingredients</h3>
                <div className="overflow-x-auto">
                  <table className="table table-lg">
                    <thead>
                      <tr>
                        <th>Ingredient</th>
                        <th>Quantity</th>
                        <th>Unit Cost</th>
                        <th>Total Cost</th>
                      </tr>
                    </thead>
                    <tbody className="text-base">
                      {section.ingredients.map((ing) => {
                        const quantity = Number(ing.quantity);
                        const unitCost = Number(ing.ingredient.costPerUnit);
                        const ingredientUnit = ing.ingredient.unit;
                        const recipeUnit = ing.unit;

                        // Calculate cost with proper unit conversion
                        const totalIngredientCost = calculateIngredientCost(
                          quantity,
                          recipeUnit,
                          unitCost,
                          ingredientUnit
                        );

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
                              {formatQuantity(quantity)} {formatUnit(recipeUnit)}
                            </td>
                            <td>
                              {formatCurrency(unitCost)}/{formatUnit(ingredientUnit)}
                            </td>
                            <td className="font-semibold">
                              {totalIngredientCost !== null
                                ? formatCurrency(totalIngredientCost)
                                : 'N/A'}
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
              <div>
                <h3 className="font-semibold mb-2 text-base-content/70">Instructions</h3>
                <MarkdownViewer
                  content={section.instructions}
                  className="prose prose-sm max-w-none"
                />
              </div>
            )}
          </section>
        ))}

        {/* Last Updated */}
        <p className="text-sm text-base-content/60">
          Last updated {formatDistanceToNow(new Date(recipe.updatedAt), { addSuffix: true })}
        </p>
      </div>
    </>
  );
}
