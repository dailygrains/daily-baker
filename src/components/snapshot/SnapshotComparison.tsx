'use client';

import { useEffect, useState } from 'react';
import { X, ArrowRight, Plus, Minus, RefreshCw, Calendar } from 'lucide-react';
import { format } from 'date-fns';
import { compareSnapshots, getSnapshotData } from '@/app/actions/snapshot';
import type { SnapshotDiff, Snapshot, RecipeSnapshotData, ProductionSheetSnapshot } from '@/lib/snapshot/types/index';

interface SnapshotComparisonProps {
  olderKey: string;
  newerKey: string;
  // entityType is passed but not currently needed - the comparison works for any type
  entityType: 'recipe' | 'production-sheet'; // eslint-disable-line @typescript-eslint/no-unused-vars
  onClose: () => void;
}

export function SnapshotComparison({
  olderKey,
  newerKey,
  entityType,
  onClose,
}: SnapshotComparisonProps) {
  const [diff, setDiff] = useState<SnapshotDiff | null>(null);
  const [olderSnapshot, setOlderSnapshot] = useState<Snapshot<RecipeSnapshotData | ProductionSheetSnapshot> | null>(null);
  const [newerSnapshot, setNewerSnapshot] = useState<Snapshot<RecipeSnapshotData | ProductionSheetSnapshot> | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchData() {
      setLoading(true);
      setError(null);

      try {
        // Fetch both snapshots and the diff in parallel
        const [diffResult, olderResult, newerResult] = await Promise.all([
          compareSnapshots(olderKey, newerKey),
          getSnapshotData(olderKey),
          getSnapshotData(newerKey),
        ]);

        if (!diffResult.success || !diffResult.data) {
          setError(diffResult.error || 'Failed to compare snapshots');
          return;
        }

        if (!olderResult.success || !olderResult.data) {
          setError(olderResult.error || 'Failed to load older snapshot');
          return;
        }

        if (!newerResult.success || !newerResult.data) {
          setError(newerResult.error || 'Failed to load newer snapshot');
          return;
        }

        setDiff(diffResult.data);
        setOlderSnapshot(olderResult.data);
        setNewerSnapshot(newerResult.data);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to compare snapshots');
      } finally {
        setLoading(false);
      }
    }

    fetchData();
  }, [olderKey, newerKey]);

  const hasChanges = diff && (diff.added.length > 0 || diff.removed.length > 0 || diff.modified.length > 0);

  return (
    <dialog className="modal modal-open">
      <div className="modal-box max-w-5xl max-h-[90vh]">
        <button
          className="btn btn-sm btn-circle btn-ghost absolute right-2 top-2"
          onClick={onClose}
        >
          <X className="h-4 w-4" />
        </button>

        <h3 className="font-bold text-lg mb-4 flex items-center gap-2">
          <RefreshCw className="h-5 w-5" />
          Snapshot Comparison
        </h3>

        {loading && (
          <div className="flex items-center justify-center py-12">
            <span className="loading loading-spinner loading-lg" />
          </div>
        )}

        {error && (
          <div className="alert alert-error">
            <span>{error}</span>
          </div>
        )}

        {diff && olderSnapshot && newerSnapshot && (
          <div className="space-y-6 overflow-y-auto">
            {/* Timeline */}
            <div className="flex items-center justify-center gap-4 bg-base-200 rounded-lg p-4">
              <div className="text-center">
                <div className="flex items-center gap-1 text-sm text-base-content/60">
                  <Calendar className="h-4 w-4" />
                  Older
                </div>
                <p className="font-medium">
                  {format(new Date(olderSnapshot.metadata.createdAt), 'MMM d, yyyy')}
                </p>
                <p className="text-xs text-base-content/60">
                  {format(new Date(olderSnapshot.metadata.createdAt), 'h:mm a')}
                </p>
                <span className={`badge ${olderSnapshot.metadata.trigger === 'COMPLETE' ? 'badge-success' : 'badge-info'} badge-sm mt-1`}>
                  {olderSnapshot.metadata.trigger}
                </span>
              </div>

              <div className="flex flex-col items-center">
                <ArrowRight className="h-6 w-6 text-base-content/40" />
                <span className="text-sm text-base-content/60">{diff.timeDelta}</span>
              </div>

              <div className="text-center">
                <div className="flex items-center gap-1 text-sm text-base-content/60">
                  <Calendar className="h-4 w-4" />
                  Newer
                </div>
                <p className="font-medium">
                  {format(new Date(newerSnapshot.metadata.createdAt), 'MMM d, yyyy')}
                </p>
                <p className="text-xs text-base-content/60">
                  {format(new Date(newerSnapshot.metadata.createdAt), 'h:mm a')}
                </p>
                <span className={`badge ${newerSnapshot.metadata.trigger === 'COMPLETE' ? 'badge-success' : 'badge-info'} badge-sm mt-1`}>
                  {newerSnapshot.metadata.trigger}
                </span>
              </div>
            </div>

            {/* Summary */}
            <div className="grid grid-cols-3 gap-4">
              <div className="stat bg-success/10 rounded-lg">
                <div className="stat-figure text-success">
                  <Plus className="h-6 w-6" />
                </div>
                <div className="stat-title">Added</div>
                <div className="stat-value text-success">{diff.added.length}</div>
              </div>
              <div className="stat bg-error/10 rounded-lg">
                <div className="stat-figure text-error">
                  <Minus className="h-6 w-6" />
                </div>
                <div className="stat-title">Removed</div>
                <div className="stat-value text-error">{diff.removed.length}</div>
              </div>
              <div className="stat bg-warning/10 rounded-lg">
                <div className="stat-figure text-warning">
                  <RefreshCw className="h-6 w-6" />
                </div>
                <div className="stat-title">Modified</div>
                <div className="stat-value text-warning">{diff.modified.length}</div>
              </div>
            </div>

            {!hasChanges && (
              <div className="alert">
                <span>No differences found between these snapshots.</span>
              </div>
            )}

            {/* Detailed Changes */}
            {hasChanges && (
              <div className="space-y-4">
                {/* Added */}
                {diff.added.length > 0 && (
                  <div>
                    <h4 className="font-semibold flex items-center gap-2 mb-2 text-success">
                      <Plus className="h-4 w-4" />
                      Added Fields ({diff.added.length})
                    </h4>
                    <div className="bg-success/10 rounded-lg p-3">
                      <ul className="space-y-1">
                        {diff.added.map((path, idx) => (
                          <li key={idx} className="font-mono text-sm">
                            + {path}
                          </li>
                        ))}
                      </ul>
                    </div>
                  </div>
                )}

                {/* Removed */}
                {diff.removed.length > 0 && (
                  <div>
                    <h4 className="font-semibold flex items-center gap-2 mb-2 text-error">
                      <Minus className="h-4 w-4" />
                      Removed Fields ({diff.removed.length})
                    </h4>
                    <div className="bg-error/10 rounded-lg p-3">
                      <ul className="space-y-1">
                        {diff.removed.map((path, idx) => (
                          <li key={idx} className="font-mono text-sm">
                            - {path}
                          </li>
                        ))}
                      </ul>
                    </div>
                  </div>
                )}

                {/* Modified */}
                {diff.modified.length > 0 && (
                  <div>
                    <h4 className="font-semibold flex items-center gap-2 mb-2 text-warning">
                      <RefreshCw className="h-4 w-4" />
                      Modified Fields ({diff.modified.length})
                    </h4>
                    <div className="space-y-2">
                      {diff.modified.map((mod, idx) => (
                        <div key={idx} className="bg-warning/10 rounded-lg p-3">
                          <p className="font-mono text-sm font-medium mb-2">{mod.path}</p>
                          <div className="grid grid-cols-2 gap-4 text-sm">
                            <div>
                              <p className="text-base-content/60 text-xs mb-1">Old Value</p>
                              <code className="bg-base-300 px-2 py-1 rounded text-error">
                                {formatValue(mod.oldValue)}
                              </code>
                            </div>
                            <div>
                              <p className="text-base-content/60 text-xs mb-1">New Value</p>
                              <code className="bg-base-300 px-2 py-1 rounded text-success">
                                {formatValue(mod.newValue)}
                              </code>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        <div className="modal-action">
          <button className="btn" onClick={onClose}>
            Close
          </button>
        </div>
      </div>
      <form method="dialog" className="modal-backdrop" onClick={onClose}>
        <button>close</button>
      </form>
    </dialog>
  );
}

function formatValue(value: unknown): string {
  if (value === null) return 'null';
  if (value === undefined) return 'undefined';
  if (typeof value === 'object') {
    return JSON.stringify(value, null, 2);
  }
  return String(value);
}
