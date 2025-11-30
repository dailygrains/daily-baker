'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

interface Ingredient {
  id: string;
  name: string;
  description?: string | null;
  category?: string | null;
  defaultUnit: string;
  reorderLevel?: number | null;
  vendors: Array<{
    vendor: {
      id: string;
      name: string;
    };
  }>;
  _count?: {
    inventoryItems: number;
  };
}

interface IngredientsTableProps {
  ingredients: Ingredient[];
}

const ITEMS_PER_PAGE = 10;

export function IngredientsTable({ ingredients }: IngredientsTableProps) {
  const router = useRouter();
  const [currentPage, setCurrentPage] = useState(1);

  const totalPages = Math.ceil(ingredients.length / ITEMS_PER_PAGE);
  const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
  const endIndex = startIndex + ITEMS_PER_PAGE;
  const currentIngredients = ingredients.slice(startIndex, endIndex);

  const handleRowClick = (ingredientId: string) => {
    router.push(`/dashboard/ingredients/${ingredientId}`);
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
              <th>Name</th>
              <th>Category</th>
              <th>Default Unit</th>
              <th>Reorder Level</th>
              <th>Inventory Batches</th>
              <th>Vendors</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {currentIngredients.map((ingredient) => {
              return (
                <tr
                  key={ingredient.id}
                  onClick={() => handleRowClick(ingredient.id)}
                  className="hover cursor-pointer"
                >
                  <td className="align-top">
                    <span className="font-bold">{ingredient.name}</span>
                  </td>
                  <td className="align-top">
                    {ingredient.category ? (
                      <span className="badge badge-ghost badge-sm">{ingredient.category}</span>
                    ) : (
                      <span className="text-base-content/40 italic">-</span>
                    )}
                  </td>
                  <td className="align-top">{ingredient.defaultUnit}</td>
                  <td className="align-top">
                    {ingredient.reorderLevel !== null && ingredient.reorderLevel !== undefined ? (
                      `${ingredient.reorderLevel} ${ingredient.defaultUnit}`
                    ) : (
                      <span className="text-base-content/40 italic">-</span>
                    )}
                  </td>
                  <td className="align-top">
                    {ingredient._count?.inventoryItems ? (
                      <span className="badge badge-primary badge-sm">
                        {ingredient._count.inventoryItems}
                      </span>
                    ) : (
                      <span className="text-base-content/40 italic">0</span>
                    )}
                  </td>
                  <td className="align-top">
                    {ingredient.vendors.length > 0 ? (
                      <div className="flex flex-wrap gap-1">
                        {ingredient.vendors.map((iv) => (
                          <span key={iv.vendor.id} className="badge badge-ghost badge-sm">
                            {iv.vendor.name}
                          </span>
                        ))}
                      </div>
                    ) : (
                      <span className="text-base-content/40 italic">No vendors</span>
                    )}
                  </td>
                  <td className="align-top">
                    <div className="flex gap-2">
                      <Link
                        href={`/dashboard/ingredients/${ingredient.id}`}
                        className="btn btn-ghost btn-sm"
                        onClick={(e) => e.stopPropagation()}
                      >
                        View
                      </Link>
                      <Link
                        href={`/dashboard/ingredients/${ingredient.id}/edit`}
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
