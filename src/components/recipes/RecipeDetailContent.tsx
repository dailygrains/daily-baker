import Link from 'next/link';
import { MarkdownViewer } from '@/components/ui/MarkdownViewer';
import { calculateIngredientCost, formatUnit } from '@/lib/unitConvert';
import { formatQuantity, formatCurrency } from '@/lib/format';

interface RecipeSection {
  id: string;
  name: string;
  instructions: string;
  useBakersMath?: boolean;
  bakersMathBaseIndices?: number[] | unknown;
  ingredients: Array<{
    id: string;
    quantity: { toString(): string } | number;
    unit: string;
    preparation?: string | null;
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
    description?: string | null;
    sections: RecipeSection[];
  };
}

export function RecipeDetailContent({
  recipe,
}: RecipeDetailContentProps) {
  return (
    <div className="space-y-8">
      {/* Description */}
      {recipe.description && (
        <div>
          <p className="text-lg">{recipe.description}</p>
        </div>
      )}

      {/* Recipe Sections */}
      {recipe.sections.map((section, index) => (
        <section key={section.id} className="space-y-4">
          {section.name && (
            <h2 className="text-xl font-semibold">{section.name}</h2>
          )}

          {/* Ingredients */}
          {section.ingredients.length > 0 && (() => {
            const showBakersMath = section.useBakersMath && section.ingredients.length > 0;
            const baseIndices = (Array.isArray(section.bakersMathBaseIndices) ? section.bakersMathBaseIndices : []) as number[];
            const baseQty = baseIndices.reduce((sum, idx) => {
              const ing = section.ingredients[idx];
              if (!ing) return sum;
              const qty = typeof ing.quantity === 'number'
                ? ing.quantity
                : Number(ing.quantity.toString());
              return sum + qty;
            }, 0);

            return (
            <div>
              <h3 className="font-semibold mb-2 text-base-content/70">Ingredients</h3>
              <div className="overflow-x-auto">
                <table className="table table-lg table-fixed">
                  <thead>
                    <tr>
                      <th>Ingredient</th>
                      <th className="w-[12%] whitespace-nowrap">Quantity</th>
                      {showBakersMath && (
                        <th className="w-[10%] whitespace-nowrap">Baker&apos;s %</th>
                      )}
                      <th className="w-[12%] whitespace-nowrap">Unit Cost</th>
                      <th className="w-[10%] whitespace-nowrap">Total Cost</th>
                    </tr>
                  </thead>
                  <tbody className="text-base">
                    {section.ingredients.map((ing, ingIndex) => {
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

                      // Baker's math percentage
                      const isBase = baseIndices.includes(ingIndex);
                      const bakersPercent = baseQty > 0
                        ? (quantity / baseQty) * 100
                        : null;

                      return (
                        <tr key={ing.id}>
                          <td>
                            <Link
                              href={`/dashboard/ingredients/${ing.ingredient.id}`}
                              className="link link-hover"
                            >
                              {ing.ingredient.name}
                            </Link>
                            {ing.preparation && (
                              <span className="text-base-content/70 italic">
                                , {ing.preparation}
                              </span>
                            )}
                          </td>
                          <td className="whitespace-nowrap">
                            {formatQuantity(quantity)} {formatUnit(recipeUnit)}
                          </td>
                          {showBakersMath && (
                            <td className={`whitespace-nowrap ${isBase ? 'font-bold' : ''}`}>
                              {bakersPercent !== null
                                ? `${Math.round(bakersPercent * 10) / 10}%`
                                : 'N/A'}
                            </td>
                          )}
                          <td className="whitespace-nowrap">
                            {formatCurrency(unitCost)}/{formatUnit(ingredientUnit)}
                          </td>
                          <td className="font-semibold whitespace-nowrap">
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
            );
          })()}

          {/* Instructions */}
          {section.instructions && (
            <div>
              <h3 className="font-semibold mb-2 text-base-content/70">Instructions</h3>
              <MarkdownViewer
                content={section.instructions}
                className="prose max-w-none text-xl"
              />
            </div>
          )}
        </section>
      ))}
    </div>
  );
}
