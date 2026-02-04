'use client';

import { useEffect, useState, useCallback } from 'react';
import { formatDistanceToNow, format } from 'date-fns';
import { History, Eye, GitCompare, RefreshCw, CheckCircle2, Save } from 'lucide-react';
import { getEntitySnapshots } from '@/app/actions/snapshot';
import type { SnapshotListItem, SnapshotTrigger } from '@/lib/snapshot/types/index';
import { SnapshotViewer } from './SnapshotViewer';
import { SnapshotComparison } from './SnapshotComparison';

interface SnapshotHistoryProps {
  entityType: 'recipe' | 'production-sheet';
  entityId: string;
  // bakeryId is passed but not currently needed - the server action validates bakery access
  bakeryId: string; // eslint-disable-line @typescript-eslint/no-unused-vars
}

const TRIGGER_BADGES: Record<SnapshotTrigger, { color: string; icon: React.ReactNode; label: string }> = {
  SAVE: { color: 'badge-info', icon: <Save className="h-3 w-3" />, label: 'Save' },
  COMPLETE: { color: 'badge-success', icon: <CheckCircle2 className="h-3 w-3" />, label: 'Complete' },
};

export function SnapshotHistory({ entityType, entityId, bakeryId }: SnapshotHistoryProps) {
  const [snapshots, setSnapshots] = useState<SnapshotListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [viewingKey, setViewingKey] = useState<string | null>(null);
  const [comparingKeys, setComparingKeys] = useState<[string, string] | null>(null);
  const [selectedForCompare, setSelectedForCompare] = useState<string | null>(null);

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

  const handleCompareSelect = (s3Key: string) => {
    if (!selectedForCompare) {
      setSelectedForCompare(s3Key);
    } else if (selectedForCompare === s3Key) {
      setSelectedForCompare(null);
    } else {
      // Determine order based on timestamp (older first)
      const selected = snapshots.find((s) => s.s3Key === selectedForCompare);
      const current = snapshots.find((s) => s.s3Key === s3Key);

      if (selected && current) {
        const selectedTime = new Date(selected.createdAt).getTime();
        const currentTime = new Date(current.createdAt).getTime();

        if (selectedTime < currentTime) {
          setComparingKeys([selectedForCompare, s3Key]);
        } else {
          setComparingKeys([s3Key, selectedForCompare]);
        }
      }

      setSelectedForCompare(null);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <span className="loading loading-spinner loading-lg" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="alert alert-error">
        <span>{error}</span>
        <button className="btn btn-sm" onClick={fetchSnapshots}>
          <RefreshCw className="h-4 w-4" />
          Retry
        </button>
      </div>
    );
  }

  if (snapshots.length === 0) {
    return (
      <div className="text-center py-12">
        <History className="h-12 w-12 mx-auto text-base-content/30 mb-4" />
        <p className="text-base-content/60">No history available yet</p>
        <p className="text-sm text-base-content/40 mt-1">
          Snapshots are created when you save or complete this {entityType === 'recipe' ? 'recipe' : 'production sheet'}.
        </p>
      </div>
    );
  }

  return (
    <>
      <div className="space-y-4">
        {selectedForCompare && (
          <div className="alert alert-info">
            <span>Select another snapshot to compare with</span>
            <button
              className="btn btn-sm btn-ghost"
              onClick={() => setSelectedForCompare(null)}
            >
              Cancel
            </button>
          </div>
        )}

        <div className="overflow-x-auto">
          <table className="table">
            <thead>
              <tr>
                <th>Date</th>
                <th>Trigger</th>
                <th>Version</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {snapshots.map((snapshot) => {
                const trigger = TRIGGER_BADGES[snapshot.trigger];
                const isSelected = selectedForCompare === snapshot.s3Key;

                return (
                  <tr
                    key={snapshot.s3Key}
                    className={isSelected ? 'bg-info/10' : ''}
                  >
                    <td>
                      <div className="flex flex-col">
                        <span className="font-medium">
                          {format(new Date(snapshot.createdAt), 'MMM d, yyyy')}
                        </span>
                        <span className="text-xs text-base-content/60">
                          {format(new Date(snapshot.createdAt), 'h:mm a')} ({formatDistanceToNow(new Date(snapshot.createdAt), { addSuffix: true })})
                        </span>
                      </div>
                    </td>
                    <td>
                      <span className={`badge ${trigger.color} gap-1`}>
                        {trigger.icon}
                        {trigger.label}
                      </span>
                    </td>
                    <td>
                      <span className="badge badge-ghost badge-sm">
                        v{snapshot.schemaVersion}
                      </span>
                    </td>
                    <td>
                      <div className="flex gap-2">
                        <button
                          className="btn btn-ghost btn-sm"
                          onClick={() => setViewingKey(snapshot.s3Key)}
                          title="View snapshot"
                        >
                          <Eye className="h-4 w-4" />
                        </button>
                        <button
                          className={`btn btn-sm ${isSelected ? 'btn-info' : 'btn-ghost'}`}
                          onClick={() => handleCompareSelect(snapshot.s3Key)}
                          title={isSelected ? 'Cancel comparison' : 'Compare with another snapshot'}
                          disabled={snapshots.length < 2}
                        >
                          <GitCompare className="h-4 w-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Snapshot Viewer Modal */}
      {viewingKey && (
        <SnapshotViewer
          s3Key={viewingKey}
          entityType={entityType}
          onClose={() => setViewingKey(null)}
        />
      )}

      {/* Comparison Modal */}
      {comparingKeys && (
        <SnapshotComparison
          olderKey={comparingKeys[0]}
          newerKey={comparingKeys[1]}
          entityType={entityType}
          onClose={() => setComparingKeys(null)}
        />
      )}
    </>
  );
}
