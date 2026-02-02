'use client';

import { useState } from 'react';
import Link from 'next/link';
import { ChevronDown, ChevronRight } from 'lucide-react';
import { AggregatedIngredient } from '@/lib/ingredientAggregation';

type TotalIngredientsTableProps = {
  ingredients: AggregatedIngredient[];
};

export function TotalIngredientsTable({ ingredients }: TotalIngredientsTableProps) {
  const [expandedIngredients, setExpandedIngredients] = useState<Set<string>>(new Set());

  const toggleExpanded = (ingredientId: string) => {
    setExpandedIngredients((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(ingredientId)) {
        newSet.delete(ingredientId);
      } else {
        newSet.add(ingredientId);
      }
      return newSet;
    });
  };

  return (
    <div className="overflow-x-auto">
      <table className="table">
        <thead>
          <tr>
            <th className="w-8"></th>
            <th>Ingredient</th>
            <th>Total Required</th>
            <th>Unit</th>
          </tr>
        </thead>
        <tbody>
          {ingredients.map((ingredient) => {
            const isExpanded = expandedIngredients.has(ingredient.ingredientId);
            const hasMultipleContributions = ingredient.contributions.length > 1;

            return (
              <>
                <tr
                  key={ingredient.ingredientId}
                  className={hasMultipleContributions ? 'cursor-pointer hover:bg-base-200' : ''}
                  onClick={() => hasMultipleContributions && toggleExpanded(ingredient.ingredientId)}
                >
                  <td className="w-8">
                    {hasMultipleContributions && (
                      <button className="btn btn-ghost btn-xs btn-square">
                        {isExpanded ? (
                          <ChevronDown className="h-4 w-4" />
                        ) : (
                          <ChevronRight className="h-4 w-4" />
                        )}
                      </button>
                    )}
                  </td>
                  <td>
                    <Link
                      href={`/dashboard/ingredients/${ingredient.ingredientId}`}
                      className="font-semibold hover:text-primary"
                      onClick={(e) => e.stopPropagation()}
                    >
                      {ingredient.ingredientName}
                    </Link>
                    {hasMultipleContributions && (
                      <span className="ml-2 text-xs text-base-content/50">
                        ({ingredient.contributions.length} recipes)
                      </span>
                    )}
                  </td>
                  <td className="font-mono font-semibold">
                    {ingredient.totalQuantity.toFixed(3)}
                  </td>
                  <td>{ingredient.unit}</td>
                </tr>
                {isExpanded &&
                  ingredient.contributions.map((contribution, idx) => (
                    <tr
                      key={`${ingredient.ingredientId}-${contribution.recipeId}-${idx}`}
                      className="bg-base-200/50"
                    >
                      <td></td>
                      <td className="pl-10 text-sm text-base-content/70">
                        {contribution.recipeName}
                      </td>
                      <td className="font-mono text-sm text-base-content/70">
                        {contribution.quantity.toFixed(3)}
                      </td>
                      <td className="text-sm text-base-content/70">
                        {contribution.unit}
                      </td>
                    </tr>
                  ))}
              </>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
