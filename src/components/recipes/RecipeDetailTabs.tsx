'use client';

import { SnapshotHistory } from '@/components/snapshot/SnapshotHistory';

interface RecipeDetailTabsProps {
  recipeId: string;
  bakeryId: string;
  detailsContent: React.ReactNode;
}

export function RecipeDetailTabs({
  recipeId,
  bakeryId,
  detailsContent,
}: RecipeDetailTabsProps) {
  return (
    <div role="tablist" className="tabs tabs-border">
      <input
        type="radio"
        name="recipe_detail_tabs"
        className="tab"
        aria-label="Details"
        defaultChecked
      />
      <div className="tab-content pt-6">{detailsContent}</div>

      <input
        type="radio"
        name="recipe_detail_tabs"
        className="tab"
        aria-label="History"
      />
      <div className="tab-content pt-6">
        <SnapshotHistory
          entityType="recipe"
          entityId={recipeId}
          bakeryId={bakeryId}
        />
      </div>
    </div>
  );
}
