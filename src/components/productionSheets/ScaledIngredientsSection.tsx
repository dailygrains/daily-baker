'use client';

import { useState } from 'react';
import Link from 'next/link';
import { ChevronDown, ChevronRight } from 'lucide-react';
import { RecipeScaledIngredients } from '@/lib/ingredientAggregation';

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
                    className="font-semibold hover:text-primary"
                    onClick={(e) => e.stopPropagation()}
                  >
                    {recipe.recipeName}
                  </Link>
                  <div className="text-sm text-base-content/70">
                    {recipe.scaledYieldQty.toFixed(1)} {recipe.yieldUnit} ({recipe.scale.toFixed(2)}x)
                  </div>
                </div>
              </div>
              <div className="text-right">
                <div className="font-mono">${recipe.estimatedCost.toFixed(2)}</div>
                <div className="text-sm text-base-content/70">Est. cost</div>
              </div>
            </div>

            {/* Recipe ingredients */}
            {isExpanded && (
              <div className="p-4 space-y-4">
                {recipe.sections.map((section) => (
                  <div key={section.sectionId} className="space-y-2">
                    <h4 className="font-semibold text-base-content/80">{section.sectionName}</h4>
                    <div className="overflow-x-auto">
                      <table className="table table-sm table-zebra">
                        <thead>
                          <tr>
                            <th>Ingredient</th>
                            <th>Original</th>
                            <th>Scaled</th>
                            <th>Unit</th>
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
                              <td className="font-mono text-base-content/60">
                                {ingredient.originalQuantity.toFixed(3)}
                              </td>
                              <td className="font-mono font-semibold">
                                {ingredient.scaledQuantity.toFixed(3)}
                              </td>
                              <td>{ingredient.recipeUnit}</td>
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
