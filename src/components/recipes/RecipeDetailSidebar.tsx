import { formatDistanceToNow } from 'date-fns';
import { formatCurrency } from '@/lib/format';
import { SnapshotSummary } from '@/components/snapshot/SnapshotSummary';
import { TagBadges } from '@/components/tags';

interface Tag {
  id: string;
  name: string;
  color?: string | null;
}

interface RecipeDetailSidebarProps {
  recipe: {
    id: string;
    bakeryId: string;
    yieldQty: number;
    yieldUnit: string;
    updatedAt: Date;
    _count: {
      sections: number;
      productionSheetRecipes: number;
    };
  };
  totalCost: number;
  costPerUnit: number;
  totalIngredients: number;
  tags?: Tag[];
}

export function RecipeDetailSidebar({
  recipe,
  totalCost,
  costPerUnit,
  totalIngredients,
  tags = [],
}: RecipeDetailSidebarProps) {
  return (
    <div className="space-y-6">
      {/* Summary Stats */}
      <div>
        <div>
          <h3 className="font-semibold text-base-content/70 mb-3">Summary</h3>

          <div className="space-y-3">
            <div className="flex justify-between items-center">
              <span className="text-sm text-base-content/70">Yield</span>
              <span className="font-semibold">
                {recipe.yieldQty} {recipe.yieldUnit}
              </span>
            </div>

            <div className="flex justify-between items-center">
              <span className="text-sm text-base-content/70">Total Cost</span>
              <span className="font-semibold text-success">
                {formatCurrency(totalCost)}
              </span>
            </div>

            <div className="flex justify-between items-center">
              <span className="text-sm text-base-content/70">Cost per Unit</span>
              <span className="font-semibold">
                {formatCurrency(costPerUnit)}
              </span>
            </div>

            <div className="divider my-2" />

            <div className="flex justify-between items-center">
              <span className="text-sm text-base-content/70">Sections</span>
              <span className="font-semibold">{recipe._count.sections}</span>
            </div>

            <div className="flex justify-between items-center">
              <span className="text-sm text-base-content/70">Ingredients</span>
              <span className="font-semibold">{totalIngredients}</span>
            </div>

            <div className="flex justify-between items-center">
              <span className="text-sm text-base-content/70">Production Sheets</span>
              <span className="font-semibold">{recipe._count.productionSheetRecipes}</span>
            </div>

            <div className="divider my-2" />

            <div className="flex justify-between items-center">
              <span className="text-sm text-base-content/70">Last Updated</span>
              <span className="text-sm">
                {formatDistanceToNow(new Date(recipe.updatedAt), { addSuffix: true })}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Tags */}
      {tags.length > 0 && (
        <div>
          <h3 className="font-semibold text-base-content/70 mb-3">Tags</h3>
          <TagBadges tags={tags} size="md" />
        </div>
      )}

      {/* History */}
      <div>
        <div>
          <h3 className="font-semibold text-base-content/70 mb-3">History</h3>
          <SnapshotSummary
            entityType="recipe"
            entityId={recipe.id}
            bakeryId={recipe.bakeryId}
            initialLimit={5}
          />
        </div>
      </div>
    </div>
  );
}
