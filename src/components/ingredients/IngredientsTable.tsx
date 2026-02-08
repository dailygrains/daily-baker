'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Pagination, usePageSize } from '@/components/ui/Pagination';
import { TagBadges } from '@/components/tags';
import { formatQuantity, formatCurrency } from '@/lib/format';

interface Tag {
  id: string;
  name: string;
  color?: string | null;
}

interface Ingredient {
  id: string;
  name: string;
  currentQty: string;
  unit: string;
  costPerUnit: string;
  lowStockThreshold: number | null;
  vendors: Array<{
    vendor: {
      id: string;
      name: string;
    };
  }>;
  tags?: Tag[];
}

interface IngredientsTableProps {
  ingredients: Ingredient[];
}

export function IngredientsTable({ ingredients }: IngredientsTableProps) {
  const router = useRouter();
  const [currentPage, setCurrentPage] = useState(1);
  const { itemsPerPage, setItemsPerPage, isInitialized } = usePageSize();

  const effectiveItemsPerPage = itemsPerPage === Infinity ? ingredients.length : itemsPerPage;
  const startIndex = (currentPage - 1) * effectiveItemsPerPage;
  const endIndex = startIndex + effectiveItemsPerPage;
  const currentIngredients = ingredients.slice(startIndex, endIndex);

  const handleRowClick = (ingredientId: string) => {
    router.push(`/dashboard/ingredients/${ingredientId}`);
  };

  return (
    <div className="space-y-4">
      <div className="overflow-x-auto">
        <table className="table table-zebra table-lg">
          <thead>
            <tr>
              <th>Name</th>
              <th>Current Qty</th>
              <th>Cost per Unit</th>
              <th>Tags</th>
              <th>Vendors</th>
            </tr>
          </thead>
          <tbody>
            {currentIngredients.map((ingredient) => {
              const currentQty = Number(ingredient.currentQty);
              const costPerUnit = Number(ingredient.costPerUnit);
              const threshold = ingredient.lowStockThreshold;
              // Low stock if threshold is set (not null) and greater than 0, and current qty is below it
              const isLowStock = threshold != null && threshold > 0 && currentQty < threshold;

              return (
                <tr
                  key={ingredient.id}
                  onClick={() => handleRowClick(ingredient.id)}
                  className="hover cursor-pointer"
                >
                  <td className="align-top">
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-bold">{ingredient.name}</span>
                      {isLowStock && (
                        <span className="badge badge-warning">Low Stock</span>
                      )}
                    </div>
                  </td>
                  <td className="align-top">
                    <span className={isLowStock ? 'text-warning font-semibold' : ''}>
                      {formatQuantity(currentQty)} {ingredient.unit}
                    </span>
                  </td>
                  <td className="align-top">{formatCurrency(costPerUnit)}</td>
                  <td className="align-top">
                    {ingredient.tags && ingredient.tags.length > 0 ? (
                      <TagBadges tags={ingredient.tags} size="sm" />
                    ) : (
                      <span className="text-base-content/40 italic">No tags</span>
                    )}
                  </td>
                  <td className="align-top">
                    {ingredient.vendors.length > 0 ? (
                      <div className="flex flex-wrap gap-1">
                        {ingredient.vendors.map((iv) => (
                          <span key={iv.vendor.id} className="badge badge-ghost">
                            {iv.vendor.name}
                          </span>
                        ))}
                      </div>
                    ) : (
                      <span className="text-base-content/40 italic">No vendors</span>
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
          totalItems={ingredients.length}
          currentPage={currentPage}
          onPageChange={setCurrentPage}
          itemsPerPage={itemsPerPage}
          onItemsPerPageChange={setItemsPerPage}
        />
      )}
    </div>
  );
}
