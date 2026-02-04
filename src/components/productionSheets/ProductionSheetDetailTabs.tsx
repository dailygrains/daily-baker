'use client';

import { SnapshotHistory } from '@/components/snapshot/SnapshotHistory';

interface ProductionSheetDetailTabsProps {
  productionSheetId: string;
  bakeryId: string;
  detailsContent: React.ReactNode;
}

export function ProductionSheetDetailTabs({
  productionSheetId,
  bakeryId,
  detailsContent,
}: ProductionSheetDetailTabsProps) {
  return (
    <div role="tablist" className="tabs tabs-border">
      <input
        type="radio"
        name="production_sheet_detail_tabs"
        className="tab"
        aria-label="Details"
        defaultChecked
      />
      <div className="tab-content pt-6">{detailsContent}</div>

      <input
        type="radio"
        name="production_sheet_detail_tabs"
        className="tab"
        aria-label="History"
      />
      <div className="tab-content pt-6">
        <SnapshotHistory
          entityType="production-sheet"
          entityId={productionSheetId}
          bakeryId={bakeryId}
        />
      </div>
    </div>
  );
}
