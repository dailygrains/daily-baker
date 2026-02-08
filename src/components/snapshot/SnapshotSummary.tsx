'use client';

import { useEffect, useState, useCallback } from 'react';
import { formatDistanceToNow } from 'date-fns';
import { History, Eye, ChevronDown, ChevronUp, Save, CheckCircle2 } from 'lucide-react';
import { getEntitySnapshots } from '@/app/actions/snapshot';
import type { SnapshotListItem, SnapshotTrigger } from '@/lib/snapshot/types/index';
import { SnapshotViewer } from './SnapshotViewer';

interface SnapshotSummaryProps {
  entityType: 'recipe' | 'production-sheet';
  entityId: string;
  bakeryId: string;
  initialLimit?: number;
}

const TRIGGER_ICONS: Record<SnapshotTrigger, { icon: React.ReactNode; color: string }> = {
  SAVE: { icon: <Save className="h-3 w-3" />, color: 'text-info' },
  COMPLETE: { icon: <CheckCircle2 className="h-3 w-3" />, color: 'text-success' },
};

export function SnapshotSummary({
  entityType,
  entityId,
  initialLimit = 5,
}: SnapshotSummaryProps) {
  const [snapshots, setSnapshots] = useState<SnapshotListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [expanded, setExpanded] = useState(false);
  const [viewingKey, setViewingKey] = useState<string | null>(null);

  const fetchSnapshots = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const result = await getEntitySnapshots(entityType, entityId);

      if (!result.success || !result.data) {
        setError(result.error || 'Failed to load snapshots');
        return;
      }

      setSnapshots(result.data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load snapshots');
    } finally {
      setLoading(false);
    }
  }, [entityType, entityId]);

  useEffect(() => {
    fetchSnapshots();
  }, [fetchSnapshots]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-6">
        <span className="loading loading-spinner loading-sm" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-sm text-error py-2">{error}</div>
    );
  }

  if (snapshots.length === 0) {
    return (
      <div className="text-center py-6">
        <History className="h-8 w-8 mx-auto text-base-content/30 mb-2" />
        <p className="text-sm text-base-content/60">No history yet</p>
      </div>
    );
  }

  const displayedSnapshots = expanded ? snapshots : snapshots.slice(0, initialLimit);
  const hasMore = snapshots.length > initialLimit;

  return (
    <>
      <div className="space-y-2">
        {displayedSnapshots.map((snapshot) => {
          const trigger = TRIGGER_ICONS[snapshot.trigger];

          return (
            <div
              key={snapshot.s3Key}
              className="flex items-center justify-between py-2 border-b border-base-200 last:border-0"
            >
              <div className="flex items-center gap-2">
                <span className={trigger.color}>{trigger.icon}</span>
                <span className="text-sm">
                  {formatDistanceToNow(new Date(snapshot.createdAt), { addSuffix: true })}
                </span>
              </div>
              <button
                className="btn btn-ghost btn-xs"
                onClick={() => setViewingKey(snapshot.s3Key)}
                title="View snapshot"
              >
                <Eye className="h-3 w-3" />
              </button>
            </div>
          );
        })}

        {hasMore && (
          <button
            className="btn btn-ghost btn-sm w-full"
            onClick={() => setExpanded(!expanded)}
          >
            {expanded ? (
              <>
                <ChevronUp className="h-4 w-4" />
                Show less
              </>
            ) : (
              <>
                <ChevronDown className="h-4 w-4" />
                Show all ({snapshots.length})
              </>
            )}
          </button>
        )}
      </div>

      {/* Snapshot Viewer Modal */}
      {viewingKey && (
        <SnapshotViewer
          s3Key={viewingKey}
          entityType={entityType}
          onClose={() => setViewingKey(null)}
        />
      )}
    </>
  );
}
