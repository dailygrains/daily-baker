'use client';

import Link from 'next/link';
import { formatQuantity, formatCurrency } from '@/lib/format';

type RecipeEntry = {
  id: string;
  recipeId: string;
  scale: number;
  order: number;
  recipe: {
    id: string;
    name: string;
    yieldQty: number;
    yieldUnit: string;
    totalCost: number;
  };
};

type RecipeListTableProps = {
  recipes: RecipeEntry[];
};

export function RecipeListTable({ recipes }: RecipeListTableProps) {
  // Calculate totals
  const totalCost = recipes.reduce(
    (sum, r) => sum + r.recipe.totalCost * r.scale,
    0
  );

  return (
    <div className="overflow-x-auto">
      <table className="table table-zebra">
        <thead>
          <tr>
            <th>Recipe</th>
            <th>Default Yield</th>
            <th>Scale</th>
            <th>Production Yield</th>
            <th className="text-right">Est. Cost</th>
          </tr>
        </thead>
        <tbody>
          {recipes
            .sort((a, b) => a.order - b.order)
            .map((entry) => {
              const scaledYield = entry.recipe.yieldQty * entry.scale;
              const scaledCost = entry.recipe.totalCost * entry.scale;

              return (
                <tr key={entry.id}>
                  <td>
                    <Link
                      href={`/dashboard/recipes/${entry.recipe.id}`}
                      className="text-lg font-semibold hover:text-primary"
                    >
                      {entry.recipe.name}
                    </Link>
                  </td>
                  <td className="text-lg text-base-content/70">
                    {formatQuantity(entry.recipe.yieldQty)} {entry.recipe.yieldUnit}
                  </td>
                  <td>
                    <span className="badge badge-outline text-lg">
                      {formatQuantity(entry.scale, 2)}x
                    </span>
                  </td>
                  <td className="text-lg font-semibold">
                    {formatQuantity(scaledYield)} {entry.recipe.yieldUnit}
                  </td>
                  <td className="text-right font-mono">
                    {formatCurrency(scaledCost)}
                  </td>
                </tr>
              );
            })}
        </tbody>
        <tfoot>
          <tr>
            <td colSpan={4} className="text-right font-semibold">
              Total Estimated Cost
            </td>
            <td className="text-right font-semibold font-mono">
              {formatCurrency(totalCost)}
            </td>
          </tr>
        </tfoot>
      </table>
    </div>
  );
}
