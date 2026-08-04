'use client';

import { Plus, X, DollarSign } from 'lucide-react';

interface BomLine {
  supplyId: string;
  quantity: number;
  unit: string;
  wasteFactor: number;
  costOverride: number | null;
  notes: string;
}

interface ProductSupplyLineItemsProps {
  lines: BomLine[];
  supplies: Array<{ id: string; name: string; unit: string; costPerUnit: number; category: string }>;
  onChange: (lines: BomLine[]) => void;
}

export type { BomLine };

export function ProductSupplyLineItems({ lines, supplies, onChange }: ProductSupplyLineItemsProps) {
  const addLine = () => {
    onChange([...lines, { supplyId: '', quantity: 1, unit: 'each', wasteFactor: 1, costOverride: null, notes: '' }]);
  };

  const updateLine = (index: number, field: keyof BomLine, value: string | number | null) => {
    const updated = [...lines];
    updated[index] = { ...updated[index], [field]: value };
    // When a supply is selected, default the unit to that supply's unit
    if (field === 'supplyId' && typeof value === 'string') {
      const supply = supplies.find((s) => s.id === value);
      if (supply) {
        updated[index].unit = supply.unit;
      }
    }
    onChange(updated);
  };

  const removeLine = (index: number) => {
    onChange(lines.filter((_, i) => i !== index));
  };

  // Get supply cost for display
  const getLineCost = (line: BomLine) => {
    const supply = supplies.find((s) => s.id === line.supplyId);
    const unitCost = line.costOverride ?? supply?.costPerUnit ?? 0;
    return unitCost * line.quantity * line.wasteFactor;
  };

  return (
    <div className="space-y-3">
      {lines.map((line, index) => (
        <div key={index} className="card bg-base-200 p-4">
          <div className="flex items-start gap-2">
            <div className="flex-1 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
              <fieldset className="fieldset">
                <legend className="fieldset-legend">Supply *</legend>
                <select
                  className="select select-bordered select-sm w-full"
                  value={line.supplyId}
                  onChange={(e) => updateLine(index, 'supplyId', e.target.value)}
                  required
                >
                  <option value="">Select supply...</option>
                  {supplies.map((s) => (
                    <option key={s.id} value={s.id}>{s.name}</option>
                  ))}
                </select>
              </fieldset>

              <fieldset className="fieldset">
                <legend className="fieldset-legend">Qty Per Unit *</legend>
                <input
                  type="number"
                  step="0.001"
                  min="0.001"
                  className="input input-bordered input-sm w-full"
                  value={line.quantity}
                  onChange={(e) => updateLine(index, 'quantity', parseFloat(e.target.value) || 0)}
                  required
                />
              </fieldset>

              <fieldset className="fieldset">
                <legend className="fieldset-legend">Waste Factor</legend>
                <input
                  type="number"
                  step="0.01"
                  min="1"
                  className="input input-bordered input-sm w-full"
                  value={line.wasteFactor}
                  onChange={(e) => updateLine(index, 'wasteFactor', parseFloat(e.target.value) || 1)}
                  placeholder="1.00"
                />
              </fieldset>

              <fieldset className="fieldset">
                <legend className="fieldset-legend">Cost Override</legend>
                <label className="input input-bordered input-sm w-full">
                  <DollarSign className="h-3 w-3 opacity-50" />
                  <input
                    type="number"
                    step="0.0001"
                    min="0"
                    className="grow"
                    value={line.costOverride ?? ''}
                    onChange={(e) => updateLine(index, 'costOverride', e.target.value ? parseFloat(e.target.value) : null)}
                    placeholder="Use default"
                  />
                </label>
              </fieldset>
            </div>

            <button
              type="button"
              onClick={() => removeLine(index)}
              className="btn btn-ghost btn-sm btn-square mt-6"
              title="Remove"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
          {line.supplyId && (
            <div className="text-sm text-base-content/60 mt-1">
              Line cost: ${getLineCost(line).toFixed(4)}
            </div>
          )}
        </div>
      ))}

      <button type="button" onClick={addLine} className="btn btn-outline btn-sm">
        <Plus className="h-4 w-4" />
        Add Supply
      </button>
    </div>
  );
}
