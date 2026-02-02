'use client';

import { useRouter } from 'next/navigation';
import Link from 'next/link';

interface Ingredient {
  id: string;
  name: string;
  currentQty: number;
  unit: string;
  costPerUnit: number;
  _count?: {
    lots: number;
  };
}

interface InventoryTableProps {
  ingredients: Ingredient[];
}

export function InventoryTable({ ingredients }: InventoryTableProps) {
  const router = useRouter();

  const handleRowClick = (ingredientId: string) => {
    router.push(`/dashboard/ingredients/${ingredientId}`);
  };

  return (
    <div className="overflow-x-auto">
      <table className="table table-zebra">
        <thead>
          <tr>
            <th>Ingredient</th>
            <th>Current Quantity</th>
            <th>Avg Cost/Unit</th>
            <th>Total Value</th>
            <th>Lots</th>
          </tr>
        </thead>
        <tbody>
          {ingredients.map((ingredient) => {
            const value = ingredient.currentQty * ingredient.costPerUnit;

            return (
              <tr
                key={ingredient.id}
                onClick={() => handleRowClick(ingredient.id)}
                className="hover cursor-pointer"
              >
                <td>
                  <span className="font-semibold">{ingredient.name}</span>
                </td>
                <td>
                  {ingredient.currentQty.toFixed(3)} {ingredient.unit}
                </td>
                <td>
                  {ingredient.costPerUnit > 0
                    ? `$${ingredient.costPerUnit.toFixed(2)}/${ingredient.unit}`
                    : '-'}
                </td>
                <td>${value.toFixed(2)}</td>
                <td>
                  <span className="badge badge-ghost">{ingredient._count?.lots ?? 0}</span>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
