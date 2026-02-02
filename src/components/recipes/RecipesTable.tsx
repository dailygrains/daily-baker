'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { ClipboardList } from 'lucide-react';
import { Pagination, usePageSize } from '@/components/ui/Pagination';
import { formatQuantity, formatCurrency } from '@/lib/format';

interface Recipe {
  id: string;
  name: string;
  description: string | null;
  yieldQty: number;
  yieldUnit: string;
  totalCost: string;
  _count: {
    sections: number;
    productionSheets: number;
  };
}

interface RecipesTableProps {
  recipes: Recipe[];
}

export function RecipesTable({ recipes }: RecipesTableProps) {
  const router = useRouter();
  const [currentPage, setCurrentPage] = useState(1);
  const { itemsPerPage, setItemsPerPage, isInitialized } = usePageSize();

  const effectiveItemsPerPage = itemsPerPage === Infinity ? recipes.length : itemsPerPage;
  const startIndex = (currentPage - 1) * effectiveItemsPerPage;
  const endIndex = startIndex + effectiveItemsPerPage;
  const currentRecipes = recipes.slice(startIndex, endIndex);

  const handleRowClick = (recipeId: string) => {
    router.push(`/dashboard/recipes/${recipeId}`);
  };

  const handleKeyDown = (e: React.KeyboardEvent, recipeId: string) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      handleRowClick(recipeId);
    }
  };

  return (
    <div className="space-y-4">
      <div className="overflow-x-auto">
        <table className="table table-zebra table-lg">
          <thead>
            <tr>
              <th>Recipe Name</th>
              <th>Yield</th>
              <th>Total Cost</th>
              <th>Cost per Unit</th>
              <th>Production Sheets</th>
            </tr>
          </thead>
          <tbody>
            {currentRecipes.map((recipe) => {
              const totalCost = Number(recipe.totalCost);
              const costPerUnit = recipe.yieldQty > 0 ? totalCost / recipe.yieldQty : 0;

              return (
                <tr
                  key={recipe.id}
                  onClick={() => handleRowClick(recipe.id)}
                  onKeyDown={(e) => handleKeyDown(e, recipe.id)}
                  className="hover cursor-pointer"
                  role="button"
                  tabIndex={0}
                  aria-label={`View ${recipe.name} recipe details`}
                >
                  <td className="align-top">
                    <div>
                      <span className="font-bold">{recipe.name}</span>
                      {recipe.description && (
                        <p className="text-base-content/70 truncate max-w-xs">
                          {recipe.description}
                        </p>
                      )}
                    </div>
                  </td>
                  <td className="align-top">{formatQuantity(recipe.yieldQty)} {recipe.yieldUnit}</td>
                  <td className="align-top">
                    <span className="font-semibold text-success">
                      {formatCurrency(totalCost)}
                    </span>
                  </td>
                  <td className="align-top">
                    {formatCurrency(costPerUnit)}
                  </td>
                  <td className="align-top">
                    {recipe._count.productionSheets > 0 ? (
                      <span className="badge badge-secondary gap-1">
                        <ClipboardList className="h-4 w-4" />
                        {recipe._count.productionSheets}
                      </span>
                    ) : (
                      <span className="text-base-content/50">None</span>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {isInitialized && (
        <Pagination
          totalItems={recipes.length}
          currentPage={currentPage}
          onPageChange={setCurrentPage}
          itemsPerPage={itemsPerPage}
          onItemsPerPageChange={setItemsPerPage}
        />
      )}
    </div>
  );
}
