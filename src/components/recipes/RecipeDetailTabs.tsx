'use client';

import { useState } from 'react';
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
  const [activeTab, setActiveTab] = useState<'details' | 'history'>('details');

  return (
    <div className="space-y-6">
      {/* Tabs */}
      <div role="tablist" className="tabs tabs-bordered">
        <button
          role="tab"
          className={`tab ${activeTab === 'details' ? 'tab-active' : ''}`}
          onClick={() => setActiveTab('details')}
        >
          Details
        </button>
        <button
          role="tab"
          className={`tab ${activeTab === 'history' ? 'tab-active' : ''}`}
          onClick={() => setActiveTab('history')}
        >
          History
        </button>
      </div>

      {/* Tab Content */}
      {activeTab === 'details' ? (
        detailsContent
      ) : (
        <SnapshotHistory
          entityType="recipe"
          entityId={recipeId}
          bakeryId={bakeryId}
        />
      )}
    </div>
  );
}
