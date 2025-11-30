'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Decimal } from '@prisma/client/runtime/library';

interface Ingredient {
  id: string;
  name: string;
  currentQty: Decimal | number | string;
  unit: string;
  costPerUnit: Decimal | number | string;
  vendors: Array<{
    vendor: {
      id: string;
      name: string;
    };
  }>;
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
              <th>Current Qty</th>
              <th>Cost per Unit</th>
              <th>Vendors</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {currentIngredients.map((ingredient) => {
              const currentQty = Number(ingredient.currentQty);
              const costPerUnit = Number(ingredient.costPerUnit);
              const isLowStock = currentQty < 100;

              return (
                <tr
                  key={ingredient.id}
                  onClick={() => handleRowClick(ingredient.id)}
                  className="hover cursor-pointer"
                >
                  <td className="align-top">
                    <div className="flex items-center gap-2">
                      <span className="font-bold">{ingredient.name}</span>
                      {isLowStock && (
                        <span className="badge badge-warning badge-sm">Low Stock</span>
                      )}
                    </div>
                  </td>
                  <td className="align-top">
                    <span className={isLowStock ? 'text-warning font-semibold' : ''}>
                      {currentQty.toFixed(3)} {ingredient.unit}
                    </span>
                  </td>
                  <td className="align-top">${costPerUnit.toFixed(2)}</td>
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
