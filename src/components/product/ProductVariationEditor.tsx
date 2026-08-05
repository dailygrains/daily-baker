'use client';

import { Plus, X, DollarSign, ChevronDown, ChevronRight } from 'lucide-react';
import { useState } from 'react';
import { ProductSupplyLineItems, type BomLine } from '@/components/product/ProductSupplyLineItems';
import { allocateIngredientCost, sumSupplyCost } from '@/lib/productCosting';

export interface VariationDraft {
  /** Present for variations that already exist in the database. */
  id?: string;
  name: string;
  sku: string;
  squareVariationId: string;
  unitWeightG: number | null;
  batchYieldQty: number | null;
  laborCost: number;
  overheadCost: number;
  retailPrice: number | null;
  wholesalePrice: number | null;
  targetMarginPct: number | null;
  isActive: boolean;
  supplies: BomLine[];
}

interface SupplyOption {
  id: string;
  name: string;
  unit: string;
  costPerUnit: number;
  category: string;
}

interface ProductVariationEditorProps {
  variations: VariationDraft[];
  supplies: SupplyOption[];
  /** Ingredient cost of one scaled batch of the selected recipe. */
  batchCost: number;
  /** Weight of one scaled batch in grams, or null when not derivable. */
  batchWeightG: number | null;
  onChange: (variations: VariationDraft[]) => void;
}

export function emptyVariation(name = ''): VariationDraft {
  return {
    name,
    sku: '',
    squareVariationId: '',
    unitWeightG: null,
    batchYieldQty: null,
    laborCost: 0,
    overheadCost: 0,
    retailPrice: null,
    wholesalePrice: null,
    targetMarginPct: null,
    isActive: true,
    supplies: [],
  };
}

/** Parse a number input, treating a cleared field as "not set" rather than 0. */
function parseOptionalNumber(raw: string): number | null {
  if (raw === '') return null;
  const parsed = parseFloat(raw);
  return Number.isNaN(parsed) ? null : parsed;
}

export function ProductVariationEditor({
  variations,
  supplies,
  batchCost,
  batchWeightG,
  onChange,
}: ProductVariationEditorProps) {
  const [collapsed, setCollapsed] = useState<Record<number, boolean>>({});
  const costMap = new Map(supplies.map((s) => [s.id, s.costPerUnit]));

  const update = (index: number, patch: Partial<VariationDraft>) => {
    onChange(variations.map((v, i) => (i === index ? { ...v, ...patch } : v)));
  };

  const addVariation = () => {
    onChange([...variations, emptyVariation(variations.length === 0 ? 'Regular' : '')]);
  };

  const removeVariation = (index: number) => {
    onChange(variations.filter((_, i) => i !== index));
  };

  const costsFor = (variation: VariationDraft) => {
    const { cost: ingredientCost, warning } = allocateIngredientCost(variation, {
      batchCost,
      batchWeightG,
    });
    const supplyCost = sumSupplyCost(
      variation.supplies.filter((s) => s.supplyId),
      costMap
    );
    const totalCost = ingredientCost + supplyCost + variation.laborCost + variation.overheadCost;
    const margin =
      variation.retailPrice && variation.retailPrice > 0
        ? ((variation.retailPrice - totalCost) / variation.retailPrice) * 100
        : null;
    return { ingredientCost, supplyCost, totalCost, margin, warning };
  };

  return (
    <div className="space-y-4">
      {variations.length === 0 && (
        <div className="alert">
          <span>
            Add at least one variation. If this product is only sold one way, add a single
            &ldquo;Regular&rdquo; variation.
          </span>
        </div>
      )}

      {variations.map((variation, index) => {
        const { ingredientCost, supplyCost, totalCost, margin, warning } = costsFor(variation);
        const isCollapsed = collapsed[index] ?? false;

        return (
          <div key={variation.id ?? index} className="card bg-base-200 p-4">
            <div className="flex items-center gap-2">
              <button
                type="button"
                className="btn btn-ghost btn-sm btn-square"
                onClick={() => setCollapsed({ ...collapsed, [index]: !isCollapsed })}
                aria-label={isCollapsed ? 'Expand variation' : 'Collapse variation'}
              >
                {isCollapsed ? <ChevronRight className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
              </button>
              <span className="font-semibold grow">
                {variation.name || `Variation ${index + 1}`}
                {!variation.isActive && <span className="badge badge-ghost badge-sm ml-2">Inactive</span>}
              </span>
              <span className="text-sm text-base-content/60">${totalCost.toFixed(2)}/unit</span>
              <button
                type="button"
                onClick={() => removeVariation(index)}
                className="btn btn-ghost btn-sm btn-square"
                title="Remove variation"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {!isCollapsed && (
              <div className="mt-3 space-y-3">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6">
                  <fieldset className="fieldset">
                    <legend className="fieldset-legend">Variation Name *</legend>
                    <input
                      type="text"
                      className="input input-bordered w-full"
                      value={variation.name}
                      onChange={(e) => update(index, { name: e.target.value })}
                      required
                      maxLength={200}
                      placeholder="e.g., Large"
                    />
                  </fieldset>

                  <fieldset className="fieldset">
                    <legend className="fieldset-legend">SKU</legend>
                    <input
                      type="text"
                      className="input input-bordered w-full"
                      value={variation.sku}
                      onChange={(e) => update(index, { sku: e.target.value })}
                      maxLength={100}
                      placeholder="Internal or retail SKU"
                    />
                  </fieldset>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6">
                  <fieldset className="fieldset">
                    <legend className="fieldset-legend">Unit Weight (g)</legend>
                    <input
                      type="number"
                      step="1"
                      min="1"
                      className="input input-bordered w-full"
                      value={variation.unitWeightG ?? ''}
                      onChange={(e) =>
                        update(index, { unitWeightG: parseOptionalNumber(e.target.value) })
                      }
                      placeholder="e.g., 1000"
                    />
                    <label className="label">
                      <span className="label-text-alt">
                        Cost is split by weight across sizes when set
                      </span>
                    </label>
                  </fieldset>

                  <fieldset className="fieldset">
                    <legend className="fieldset-legend">Batch Yield Qty</legend>
                    <input
                      type="number"
                      step="1"
                      min="1"
                      className="input input-bordered w-full"
                      value={variation.batchYieldQty ?? ''}
                      onChange={(e) =>
                        update(index, { batchYieldQty: parseOptionalNumber(e.target.value) })
                      }
                      placeholder="e.g., 48"
                    />
                    <label className="label">
                      <span className="label-text-alt">
                        Units per batch, for sizes not sold by weight
                      </span>
                    </label>
                  </fieldset>
                </div>

                {warning && (
                  <div className="alert alert-warning py-2">
                    <span className="text-sm">{warning}</span>
                  </div>
                )}

                <div>
                  <h3 className="font-medium mb-2">Packaging &amp; Supplies</h3>
                  <ProductSupplyLineItems
                    lines={variation.supplies}
                    supplies={supplies}
                    onChange={(lines) => update(index, { supplies: lines })}
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6">
                  <fieldset className="fieldset">
                    <legend className="fieldset-legend">Labor Cost Per Unit</legend>
                    <label className="input input-bordered w-full">
                      <DollarSign className="h-4 w-4 opacity-50" />
                      <input
                        type="number"
                        step="0.01"
                        min="0"
                        className="grow"
                        value={variation.laborCost}
                        onChange={(e) =>
                          update(index, { laborCost: parseFloat(e.target.value) || 0 })
                        }
                        placeholder="0.00"
                      />
                    </label>
                  </fieldset>

                  <fieldset className="fieldset">
                    <legend className="fieldset-legend">Overhead Cost Per Unit</legend>
                    <label className="input input-bordered w-full">
                      <DollarSign className="h-4 w-4 opacity-50" />
                      <input
                        type="number"
                        step="0.01"
                        min="0"
                        className="grow"
                        value={variation.overheadCost}
                        onChange={(e) =>
                          update(index, { overheadCost: parseFloat(e.target.value) || 0 })
                        }
                        placeholder="0.00"
                      />
                    </label>
                  </fieldset>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6">
                  <fieldset className="fieldset">
                    <legend className="fieldset-legend">Retail Price</legend>
                    <label className="input input-bordered w-full">
                      <DollarSign className="h-4 w-4 opacity-50" />
                      <input
                        type="number"
                        step="0.01"
                        min="0"
                        className="grow"
                        value={variation.retailPrice ?? ''}
                        onChange={(e) =>
                          update(index, { retailPrice: parseOptionalNumber(e.target.value) })
                        }
                        placeholder="0.00"
                      />
                    </label>
                  </fieldset>

                  <fieldset className="fieldset">
                    <legend className="fieldset-legend">Wholesale Price</legend>
                    <label className="input input-bordered w-full">
                      <DollarSign className="h-4 w-4 opacity-50" />
                      <input
                        type="number"
                        step="0.01"
                        min="0"
                        className="grow"
                        value={variation.wholesalePrice ?? ''}
                        onChange={(e) =>
                          update(index, { wholesalePrice: parseOptionalNumber(e.target.value) })
                        }
                        placeholder="0.00"
                      />
                    </label>
                  </fieldset>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6">
                  <fieldset className="fieldset">
                    <legend className="fieldset-legend">Target Margin %</legend>
                    <input
                      type="number"
                      step="0.1"
                      min="0"
                      max="100"
                      className="input input-bordered w-full"
                      value={variation.targetMarginPct ?? ''}
                      onChange={(e) =>
                        update(index, { targetMarginPct: parseOptionalNumber(e.target.value) })
                      }
                      placeholder="e.g., 65"
                    />
                  </fieldset>

                  <fieldset className="fieldset">
                    <legend className="fieldset-legend">Square Variation ID</legend>
                    <input
                      type="text"
                      className="input input-bordered w-full font-mono text-sm"
                      value={variation.squareVariationId}
                      onChange={(e) => update(index, { squareVariationId: e.target.value })}
                      maxLength={100}
                      placeholder="Set by Square sync"
                    />
                  </fieldset>
                </div>

                <label className="label cursor-pointer justify-start gap-3">
                  <input
                    type="checkbox"
                    className="checkbox"
                    checked={variation.isActive}
                    onChange={(e) => update(index, { isActive: e.target.checked })}
                  />
                  <span className="label-text">Active</span>
                </label>

                <div className="card bg-base-100 p-3">
                  <div className="grid grid-cols-2 gap-1 text-sm">
                    <div>Ingredient cost:</div>
                    <div className="font-mono">${ingredientCost.toFixed(4)}</div>
                    <div>Supply cost:</div>
                    <div className="font-mono">${supplyCost.toFixed(4)}</div>
                    <div className="font-semibold">Total cost per unit:</div>
                    <div className="font-mono font-semibold">${totalCost.toFixed(4)}</div>
                    {margin !== null && (
                      <>
                        <div>Computed margin:</div>
                        <div className={`font-semibold ${margin < 0 ? 'text-error' : 'text-success'}`}>
                          {margin.toFixed(1)}%
                        </div>
                      </>
                    )}
                  </div>
                </div>
              </div>
            )}
          </div>
        );
      })}

      <button type="button" onClick={addVariation} className="btn btn-outline btn-sm">
        <Plus className="h-4 w-4" />
        Add Variation
      </button>
    </div>
  );
}
