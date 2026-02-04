'use client';

import { useEffect, useState } from 'react';
import { X, FileJson, Calendar, User, Tag } from 'lucide-react';
import { format } from 'date-fns';
import { getSnapshotData } from '@/app/actions/snapshot';
import type { Snapshot, RecipeSnapshotData, ProductionSheetSnapshot } from '@/lib/snapshot/types/index';
import { formatQuantity, formatCurrency } from '@/lib/format';
import { formatUnit } from '@/lib/unitConvert';
import { MarkdownViewer } from '@/components/ui/MarkdownViewer';

interface SnapshotViewerProps {
  s3Key: string;
  entityType: 'recipe' | 'production-sheet';
  onClose: () => void;
}

export function SnapshotViewer({ s3Key, entityType, onClose }: SnapshotViewerProps) {
  const [snapshot, setSnapshot] = useState<Snapshot<RecipeSnapshotData | ProductionSheetSnapshot> | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchSnapshot() {
      setLoading(true);
      setError(null);

      try {
        const result = await getSnapshotData(s3Key);

        if (!result.success || !result.data) {
          setError(result.error || 'Failed to load snapshot');
          return;
        }

        setSnapshot(result.data);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load snapshot');
      } finally {
        setLoading(false);
      }
    }

    fetchSnapshot();
  }, [s3Key]);

  return (
    <dialog className="modal modal-open">
      <div className="modal-box max-w-4xl max-h-[90vh]">
        <button
          className="btn btn-sm btn-circle btn-ghost absolute right-2 top-2"
          onClick={onClose}
        >
          <X className="h-4 w-4" />
        </button>

        <h3 className="font-bold text-lg mb-4 flex items-center gap-2">
          <FileJson className="h-5 w-5" />
          Snapshot Details
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

        {snapshot && (
          <div className="space-y-6 overflow-y-auto">
            {/* Metadata */}
            <div className="bg-base-200 rounded-lg p-4">
              <h4 className="font-semibold mb-3">Metadata</h4>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                <div className="flex items-center gap-2">
                  <Calendar className="h-4 w-4 text-base-content/60" />
                  <div>
                    <p className="text-base-content/60">Created</p>
                    <p>{format(new Date(snapshot.metadata.createdAt), 'PPpp')}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Tag className="h-4 w-4 text-base-content/60" />
                  <div>
                    <p className="text-base-content/60">Trigger</p>
                    <span className={`badge ${snapshot.metadata.trigger === 'COMPLETE' ? 'badge-success' : 'badge-info'} badge-sm`}>
                      {snapshot.metadata.trigger}
                    </span>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <FileJson className="h-4 w-4 text-base-content/60" />
                  <div>
                    <p className="text-base-content/60">Schema Version</p>
                    <p>v{snapshot.metadata.schemaVersion}</p>
                  </div>
                </div>
                {snapshot.metadata.triggeredBy && (
                  <div className="flex items-center gap-2">
                    <User className="h-4 w-4 text-base-content/60" />
                    <div>
                      <p className="text-base-content/60">Triggered By</p>
                      <p className="truncate max-w-[150px]">{snapshot.metadata.triggeredBy}</p>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Data Content */}
            {entityType === 'recipe' ? (
              <RecipeSnapshotContent data={snapshot.data as RecipeSnapshotData} />
            ) : (
              <ProductionSheetSnapshotContent data={snapshot.data as ProductionSheetSnapshot} />
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

function RecipeSnapshotContent({ data }: { data: RecipeSnapshotData }) {
  return (
    <div className="space-y-4">
      {/* Recipe Overview */}
      <div>
        <h4 className="font-semibold mb-2">{data.name}</h4>
        {data.description && (
          <div className="prose prose-sm max-w-none text-base-content/70">
            <MarkdownViewer content={data.description} />
          </div>
        )}
      </div>

      <div className="grid grid-cols-3 gap-4 text-sm">
        <div>
          <p className="text-base-content/60">Yield</p>
          <p className="font-semibold">{data.yieldQty} {data.yieldUnit}</p>
        </div>
        <div>
          <p className="text-base-content/60">Total Cost</p>
          <p className="font-semibold text-success">{formatCurrency(data.totalCost)}</p>
        </div>
        <div>
          <p className="text-base-content/60">Sections</p>
          <p className="font-semibold">{data.sections.length}</p>
        </div>
      </div>

      {/* Sections */}
      {data.sections.map((section, idx) => (
        <div key={section.id} className="border border-base-300 rounded-lg p-4">
          <div className="flex items-center gap-2 mb-3">
            <span className="badge badge-primary badge-sm">{idx + 1}</span>
            <h5 className="font-medium">{section.name}</h5>
          </div>

          {section.ingredients.length > 0 && (
            <table className="table table-sm">
              <thead>
                <tr>
                  <th>Ingredient</th>
                  <th>Quantity</th>
                </tr>
              </thead>
              <tbody>
                {section.ingredients.map((ing, ingIdx) => (
                  <tr key={ingIdx}>
                    <td>{ing.ingredientName}</td>
                    <td>{formatQuantity(ing.quantity)} {formatUnit(ing.unit)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}

          {section.instructions && (
            <div className="mt-3 prose prose-sm max-w-none">
              <MarkdownViewer content={section.instructions} />
            </div>
          )}
        </div>
      ))}
    </div>
  );
}

function ProductionSheetSnapshotContent({ data }: { data: ProductionSheetSnapshot }) {
  return (
    <div className="space-y-4">
      {/* Overview */}
      <div className="grid grid-cols-2 md:grid-cols-3 gap-4 text-sm">
        <div>
          <p className="text-base-content/60">Completed At</p>
          <p className="font-semibold">{format(new Date(data.completedAt), 'PPpp')}</p>
        </div>
        <div>
          <p className="text-base-content/60">Total Cost</p>
          <p className="font-semibold text-success">{formatCurrency(data.totalCost)}</p>
        </div>
        <div>
          <p className="text-base-content/60">Recipes</p>
          <p className="font-semibold">{data.recipes.length}</p>
        </div>
      </div>

      {/* Recipes */}
      <div>
        <h4 className="font-semibold mb-2">Recipes</h4>
        <div className="space-y-4">
          {data.recipes.map((recipe, idx) => (
            <div key={idx} className="border border-base-300 rounded-lg p-4">
              <div className="flex justify-between items-start mb-2">
                <div>
                  <h5 className="font-medium">{recipe.recipeName}</h5>
                  <p className="text-sm text-base-content/60">
                    Scale: {recipe.scale}x | Yield: {recipe.scaledYieldQty} {recipe.yieldUnit}
                  </p>
                </div>
                <span className="badge badge-success">{formatCurrency(recipe.totalCost)}</span>
              </div>

              {recipe.sections.map((section, sIdx) => (
                <div key={sIdx} className="mt-2">
                  <p className="text-sm font-medium text-base-content/70">{section.sectionName}</p>
                  <div className="pl-4">
                    {section.ingredients.map((ing, iIdx) => (
                      <p key={iIdx} className="text-sm">
                        {ing.ingredientName}: {formatQuantity(ing.scaledQuantity)} {formatUnit(ing.unit)}
                        {ing.originalQuantity !== ing.scaledQuantity && (
                          <span className="text-base-content/50 ml-1">
                            (base: {formatQuantity(ing.originalQuantity)})
                          </span>
                        )}
                      </p>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          ))}
        </div>
      </div>

      {/* Aggregated Ingredients */}
      <div>
        <h4 className="font-semibold mb-2">Total Ingredients</h4>
        <table className="table table-sm">
          <thead>
            <tr>
              <th>Ingredient</th>
              <th>Total Quantity</th>
              <th>Sources</th>
            </tr>
          </thead>
          <tbody>
            {data.aggregatedIngredients.map((ing, idx) => (
              <tr key={idx}>
                <td>{ing.ingredientName}</td>
                <td>{formatQuantity(ing.totalQuantity)} {formatUnit(ing.unit)}</td>
                <td className="text-sm text-base-content/60">
                  {ing.contributions.map((c) => c.recipeName).join(', ')}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
