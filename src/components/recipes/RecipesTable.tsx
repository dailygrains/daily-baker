'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Layers, ClipboardList } from 'lucide-react';
import { Pagination, usePageSize } from '@/components/ui/Pagination';

interface Recipe {
  id: string;
  name: string;
  description: string | null;
  yield: string;
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
        <table className="table table-zebra">
          <thead>
            <tr>
              <th>Recipe Name</th>
              <th>Yield</th>
              <th>Sections</th>
              <th>Total Cost</th>
              <th>Cost per Unit</th>
              <th>Production Sheets</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {currentRecipes.map((recipe) => {
              const yieldMatch = recipe.yield.match(/(\d+)/);
              const yieldNum = yieldMatch ? parseInt(yieldMatch[1]) : 1;
              const totalCost = Number(recipe.totalCost);
              const costPerUnit = yieldNum > 0 ? (totalCost / yieldNum).toFixed(2) : '0.00';

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
                        <p className="text-sm text-base-content/70 truncate max-w-xs">
                          {recipe.description}
                        </p>
                      )}
                    </div>
                  </td>
                  <td className="align-top">{recipe.yield}</td>
                  <td className="align-top">
                    <span className="badge badge-info gap-1">
                      <Layers className="h-3 w-3" />
                      {recipe._count.sections}
                    </span>
                  </td>
                  <td className="align-top">
                    <span className="font-semibold text-success">
                      ${totalCost.toFixed(2)}
                    </span>
                  </td>
                  <td className="align-top">
                    <span className="text-sm">
                      ${costPerUnit}
                    </span>
                  </td>
                  <td className="align-top">
                    {recipe._count.productionSheets > 0 ? (
                      <span className="badge badge-secondary gap-1">
                        <ClipboardList className="h-3 w-3" />
                        {recipe._count.productionSheets}
                      </span>
                    ) : (
                      <span className="text-base-content/50">None</span>
                    )}
                  </td>
                  <td className="align-top">
                    <div className="flex gap-2">
                      <Link
                        href={`/dashboard/recipes/${recipe.id}`}
                        className="btn btn-ghost btn-sm"
                        onClick={(e) => e.stopPropagation()}
                      >
                        View
                      </Link>
                      <Link
                        href={`/dashboard/recipes/${recipe.id}/edit`}
                        className="btn btn-ghost btn-sm"
                        onClick={(e) => e.stopPropagation()}
                      >
                        Edit
                      </Link>
                    </div>
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
