'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Layers, ClipboardList } from 'lucide-react';

interface Recipe {
  id: string;
  name: string;
  description: string | null;
  yield: string;
  totalCost: string;
  _count: {
    sections: number;
    bakeSheets: number;
  };
}

interface RecipesTableProps {
  recipes: Recipe[];
}

const ITEMS_PER_PAGE = 10;

export function RecipesTable({ recipes }: RecipesTableProps) {
  const router = useRouter();
  const [currentPage, setCurrentPage] = useState(1);

  const totalPages = Math.ceil(recipes.length / ITEMS_PER_PAGE);
  const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
  const endIndex = startIndex + ITEMS_PER_PAGE;
  const currentRecipes = recipes.slice(startIndex, endIndex);

  const handleRowClick = (recipeId: string) => {
    router.push(`/dashboard/recipes/${recipeId}`);
  };

  const handlePageChange = (page: number) => {
    setCurrentPage(page);
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
              <th>Bake Sheets</th>
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
                  className="hover cursor-pointer"
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
                    {recipe._count.bakeSheets > 0 ? (
                      <span className="badge badge-secondary gap-1">
                        <ClipboardList className="h-3 w-3" />
                        {recipe._count.bakeSheets}
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

      {totalPages > 1 && (
        <div className="flex justify-center">
          <div className="join">
            <button
              className="join-item btn btn-sm"
              onClick={() => handlePageChange(currentPage - 1)}
              disabled={currentPage === 1}
            >
              «
            </button>
            {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => (
              <button
                key={page}
                className={`join-item btn btn-sm ${
                  currentPage === page ? 'btn-active' : ''
                }`}
                onClick={() => handlePageChange(page)}
              >
                {page}
              </button>
            ))}
            <button
              className="join-item btn btn-sm"
              onClick={() => handlePageChange(currentPage + 1)}
              disabled={currentPage === totalPages}
            >
              »
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
