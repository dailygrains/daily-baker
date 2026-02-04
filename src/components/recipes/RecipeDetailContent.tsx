import Link from 'next/link';
import { formatDistanceToNow } from 'date-fns';
import { MarkdownViewer } from '@/components/ui/MarkdownViewer';
import { calculateIngredientCost, formatUnit } from '@/lib/unitConvert';
import { formatQuantity, formatCurrency } from '@/lib/format';

interface RecipeSection {
  id: string;
  name: string;
  instructions: string;
  ingredients: Array<{
    id: string;
    quantity: { toString(): string } | number;
    unit: string;
    ingredient: {
      id: string;
      name: string;
      unit: string;
      costPerUnit: number;
    };
  }>;
}

interface RecipeDetailContentProps {
  recipe: {
    id: string;
    name: string;
    yieldQty: number;
    yieldUnit: string;
    updatedAt: Date;
    sections: RecipeSection[];
    _count: {
      sections: number;
      productionSheetRecipes: number;
    };
  };
  totalCost: number;
  costPerUnit: number;
  totalIngredients: number;
}

export function RecipeDetailContent({
  recipe,
  totalCost,
  costPerUnit,
  totalIngredients,
}: RecipeDetailContentProps) {
  return (
    <div className="space-y-8">
      {/* Overview Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
        <div>
          <p className="text-sm text-base-content/70">Yield</p>
          <p className="text-2xl font-bold">
            {recipe.yieldQty} {recipe.yieldUnit}
          </p>
        </div>

        <div>
          <p className="text-sm text-base-content/70">Total Cost</p>
          <p className="text-2xl font-bold text-success">
            {formatCurrency(totalCost)}
          </p>
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
                      const quantity =
                        typeof ing.quantity === 'number'
                          ? ing.quantity
                          : Number(ing.quantity.toString());
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
        Last updated{' '}
        {formatDistanceToNow(new Date(recipe.updatedAt), { addSuffix: true })}
      </p>
    </div>
  );
}
