'use client';

import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Calendar } from 'lucide-react';
import { formatDistanceToNow, format } from 'date-fns';

type ProductionSheetRecipe = {
  scale: number;
  recipe: {
    name: string;
    totalCost: number | null;
  };
};

type ProductionSheet = {
  id: string;
  description: string | null;
  scheduledFor: Date | null;
  createdAt: Date;
  completedAt: Date | null;
  recipes: ProductionSheetRecipe[];
  completer?: {
    name: string | null;
  } | null;
};

interface ProductionSheetsTableProps {
  productionSheets: ProductionSheet[];
  variant: 'pending' | 'completed';
}

export function ProductionSheetsTable({ productionSheets, variant }: ProductionSheetsTableProps) {
  const router = useRouter();

  const getRecipeNames = (recipes: ProductionSheetRecipe[]): string => {
    if (recipes.length === 0) return 'No recipes';
    return recipes.map((r) => r.recipe.name).join(', ');
  };

  const getTotalCost = (recipes: ProductionSheetRecipe[]): number => {
    return recipes.reduce((sum, r) => {
      return sum + (r.recipe.totalCost || 0) * r.scale;
    }, 0);
  };

  const handleRowClick = (id: string) => {
    router.push(`/dashboard/production-sheets/${id}`);
  };

  if (variant === 'pending') {
    return (
      <div className="overflow-x-auto">
        <table className="table table-zebra table-lg">
          <thead>
            <tr>
              <th>Description / Recipes</th>
              <th>Recipes</th>
              <th>Scheduled</th>
              <th>Est. Cost</th>
              <th>Created</th>
            </tr>
          </thead>
          <tbody>
            {productionSheets.map((productionSheet) => (
              <tr
                key={productionSheet.id}
                className="hover cursor-pointer"
                onClick={() => handleRowClick(productionSheet.id)}
              >
                <td>
                  <Link
                    href={`/dashboard/production-sheets/${productionSheet.id}`}
                    className="font-semibold hover:text-primary"
                    onClick={(e) => e.stopPropagation()}
                  >
                    {productionSheet.description || getRecipeNames(productionSheet.recipes)}
                  </Link>
                  {productionSheet.description && (
                    <p className="text-sm text-base-content/60">
                      {getRecipeNames(productionSheet.recipes)}
                    </p>
                  )}
                </td>
                <td>
                  <span className="badge badge-outline">
                    {productionSheet.recipes.length}
                  </span>
                </td>
                <td>
                  {productionSheet.scheduledFor ? (
                    <div className="flex items-center gap-1 text-sm">
                      <Calendar className="h-4 w-4 text-base-content/60" />
                      {format(new Date(productionSheet.scheduledFor), 'MMM d, h:mm a')}
                    </div>
                  ) : (
                    <span className="text-base-content/40">-</span>
                  )}
                </td>
                <td className="font-mono">
                  ${getTotalCost(productionSheet.recipes).toFixed(2)}
                </td>
                <td className="text-sm text-base-content/70">
                  {formatDistanceToNow(new Date(productionSheet.createdAt), {
                    addSuffix: true,
                  })}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );
  }

  return (
    <div className="overflow-x-auto">
      <table className="table table-zebra table-lg">
        <thead>
          <tr>
            <th>Description / Recipes</th>
            <th>Recipes</th>
            <th>Total Cost</th>
            <th>Completed</th>
            <th>Completed By</th>
          </tr>
        </thead>
        <tbody>
          {productionSheets.map((productionSheet) => (
            <tr
              key={productionSheet.id}
              className="hover cursor-pointer"
              onClick={() => handleRowClick(productionSheet.id)}
            >
              <td>
                <Link
                  href={`/dashboard/production-sheets/${productionSheet.id}`}
                  className="font-semibold hover:text-primary"
                  onClick={(e) => e.stopPropagation()}
                >
                  {productionSheet.description || getRecipeNames(productionSheet.recipes)}
                </Link>
                {productionSheet.description && (
                  <p className="text-sm text-base-content/60">
                    {getRecipeNames(productionSheet.recipes)}
                  </p>
                )}
              </td>
              <td>
                <span className="badge badge-outline">
                  {productionSheet.recipes.length}
                </span>
              </td>
              <td className="font-mono">
                ${getTotalCost(productionSheet.recipes).toFixed(2)}
              </td>
              <td className="text-sm text-base-content/70">
                {productionSheet.completedAt &&
                  formatDistanceToNow(new Date(productionSheet.completedAt), {
                    addSuffix: true,
                  })}
              </td>
              <td className="text-sm text-base-content/70">
                {productionSheet.completer?.name || 'Unknown'}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
