'use client';

import { useState } from 'react';
import Link from 'next/link';
import { ChevronDown, ChevronRight } from 'lucide-react';
import { RecipeScaledIngredients } from '@/lib/ingredientAggregation';
import { formatQuantity, formatCurrency } from '@/lib/format';

type ScaledIngredientsSectionProps = {
  recipes: RecipeScaledIngredients[];
};

export function ScaledIngredientsSection({ recipes }: ScaledIngredientsSectionProps) {
  // Start with all recipes expanded
  const [expandedRecipes, setExpandedRecipes] = useState<Set<string>>(
    new Set(recipes.map((r) => r.recipeId))
  );

  const toggleExpanded = (recipeId: string) => {
    setExpandedRecipes((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(recipeId)) {
        newSet.delete(recipeId);
      } else {
        newSet.add(recipeId);
      }
      return newSet;
    });
  };

  const expandAll = () => {
    setExpandedRecipes(new Set(recipes.map((r) => r.recipeId)));
  };

  const collapseAll = () => {
    setExpandedRecipes(new Set());
  };

  return (
    <div className="space-y-4">
      {/* Expand/Collapse controls */}
      {recipes.length > 1 && (
        <div className="flex gap-2 justify-end">
          <button
            className="btn btn-ghost btn-xs"
            onClick={expandAll}
          >
            Expand All
          </button>
          <button
            className="btn btn-ghost btn-xs"
            onClick={collapseAll}
          >
            Collapse All
          </button>
        </div>
      )}

      {recipes.map((recipe) => {
        const isExpanded = expandedRecipes.has(recipe.recipeId);

        return (
          <div key={recipe.recipeId} className="border border-base-300 rounded-lg overflow-hidden">
            {/* Recipe header */}
            <div
              className="flex items-center justify-between p-4 bg-base-200 cursor-pointer hover:bg-base-300"
              onClick={() => toggleExpanded(recipe.recipeId)}
            >
              <div className="flex items-center gap-3">
                <button className="btn btn-ghost btn-sm btn-square">
                  {isExpanded ? (
                    <ChevronDown className="h-5 w-5" />
                  ) : (
                    <ChevronRight className="h-5 w-5" />
                  )}
                </button>
                <div>
                  <Link
                    href={`/dashboard/recipes/${recipe.recipeId}`}
                    className="text-xl font-semibold hover:text-primary"
                    onClick={(e) => e.stopPropagation()}
                  >
                    {recipe.recipeName}
                  </Link>
                  <div className="text-sm text-base-content/70">
                    {formatQuantity(recipe.scaledYieldQty)} {recipe.yieldUnit} ({formatQuantity(recipe.scale, 2)}x)
                  </div>
                </div>
              </div>
              <div className="text-right">
                <div className="font-mono">{formatCurrency(recipe.estimatedCost)}</div>
                <div className="text-sm text-base-content/70">Est. cost</div>
              </div>
            </div>

            {/* Recipe ingredients */}
            {isExpanded && (
              <div className="p-4 space-y-4">
                {recipe.sections.map((section) => (
                  <div key={section.sectionId} className="space-y-2">
                    <h4 className="text-lg font-semibold text-base-content/80">{section.sectionName}</h4>
                    <div className="overflow-x-auto">
                      <table className="table table-lg table-zebra w-full">
                        <thead>
                          <tr>
                            <th className="w-full">Ingredient</th>
                            <th className="text-right w-40">Original</th>
                            <th className="text-right w-40">Scaled</th>
                          </tr>
                        </thead>
                        <tbody>
                          {section.ingredients.map((ingredient) => (
                            <tr key={`${section.sectionId}-${ingredient.ingredientId}`}>
                              <td>
                                <Link
                                  href={`/dashboard/ingredients/${ingredient.ingredientId}`}
                                  className="hover:text-primary"
                                >
                                  {ingredient.ingredientName}
                                </Link>
                              </td>
                              <td className="font-mono text-base-content/60 text-right whitespace-nowrap">
                                {formatQuantity(ingredient.originalQuantity)} {ingredient.recipeUnit}
                              </td>
                              <td className="font-mono font-semibold text-right whitespace-nowrap">
                                {formatQuantity(ingredient.scaledQuantity)} {ingredient.recipeUnit}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
