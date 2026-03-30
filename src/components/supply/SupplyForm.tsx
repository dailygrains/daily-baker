'use client';

import { useState, useRef, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { createSupply, updateSupply } from '@/app/actions/supply';
import { useFormSubmit } from '@/hooks/useFormSubmit';
import type { Supply, SupplyCategory } from '@/generated/prisma';
import { DollarSign } from 'lucide-react';

interface SupplyFormProps {
  bakeryId: string;
  supply?: Omit<Supply, 'costPerUnit' | 'quantityOnHand' | 'lowStockThreshold'> & {
    costPerUnit: number;
    quantityOnHand: number;
    lowStockThreshold: number | null;
    vendors: Array<{ vendor: { id: string; name: string } }>;
  };
  vendors?: Array<{ id: string; name: string }>;
  onFormRefChange?: (ref: HTMLFormElement | null) => void;
  onSavingChange?: (isSaving: boolean) => void;
  onUnsavedChangesChange?: (hasChanges: boolean) => void;
  showBottomActions?: boolean;
}

const CATEGORY_OPTIONS: { value: SupplyCategory; label: string }[] = [
  { value: 'PACKAGING', label: 'Packaging' },
  { value: 'DISPOSABLE', label: 'Disposable' },
  { value: 'LABEL', label: 'Label' },
  { value: 'CLEANING', label: 'Cleaning' },
  { value: 'OTHER', label: 'Other' },
];

export function SupplyForm({
  bakeryId,
  supply,
  vendors = [],
  onFormRefChange,
  onSavingChange,
  onUnsavedChangesChange,
  showBottomActions = true,
}: SupplyFormProps) {
  const router = useRouter();
  const formRef = useRef<HTMLFormElement>(null);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);

  const { submit, isSubmitting, error } = useFormSubmit({
    mode: supply ? 'edit' : 'create',
    entityName: 'Supply',
    listPath: '/dashboard/supplies',
    onSuccess: () => setHasUnsavedChanges(false),
  });

  const [formData, setFormData] = useState({
    name: supply?.name ?? '',
    sku: supply?.sku ?? '',
    category: (supply?.category ?? 'OTHER') as SupplyCategory,
    description: supply?.description ?? '',
    unit: supply?.unit ?? 'each',
    unitsPerCase: supply?.unitsPerCase ?? '',
    costPerUnit: supply?.costPerUnit ?? 0,
    quantityOnHand: supply?.quantityOnHand ?? 0,
    lowStockThreshold: supply?.lowStockThreshold ?? '',
    vendorIds: supply?.vendors.map((v) => v.vendor.id) ?? [],
  });

  useEffect(() => {
    if (onFormRefChange && formRef.current) {
      onFormRefChange(formRef.current);
    }
  }, [onFormRefChange]);

  useEffect(() => {
    if (onSavingChange) onSavingChange(isSubmitting);
  }, [isSubmitting, onSavingChange]);

  useEffect(() => {
    if (onUnsavedChangesChange) onUnsavedChangesChange(hasUnsavedChanges);
  }, [hasUnsavedChanges, onUnsavedChangesChange]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const payload = {
      ...formData,
      unitsPerCase: formData.unitsPerCase ? Number(formData.unitsPerCase) : null,
      lowStockThreshold: formData.lowStockThreshold !== '' ? Number(formData.lowStockThreshold) : null,
    };

    await submit(
      () =>
        supply
          ? updateSupply({ id: supply.id, ...payload })
          : createSupply({ bakeryId, ...payload }),
      formData.name
    );
  };

  const updateField = (field: string, value: string | number | string[]) => {
    setFormData({ ...formData, [field]: value });
    setHasUnsavedChanges(true);
  };

  const toggleVendor = (vendorId: string) => {
    const current = formData.vendorIds;
    const updated = current.includes(vendorId)
      ? current.filter((id) => id !== vendorId)
      : [...current, vendorId];
    updateField('vendorIds', updated);
  };

  return (
    <form ref={formRef} onSubmit={handleSubmit} className="space-y-8">
      {error && (
        <div className="alert alert-error">
          <span>{error}</span>
        </div>
      )}

      <div className="space-y-0">
        <h2 className="text-xl font-semibold">Basic Information</h2>

        <fieldset className="fieldset">
          <legend className="fieldset-legend">Supply Name *</legend>
          <input
            type="text"
            className="input input-bordered w-full"
            value={formData.name}
            onChange={(e) => updateField('name', e.target.value)}
            required
            maxLength={200}
            placeholder="e.g., 16oz Kraft Box"
          />
        </fieldset>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6">
          <fieldset className="fieldset">
            <legend className="fieldset-legend">Category *</legend>
            <select
              className="select select-bordered w-full"
              value={formData.category}
              onChange={(e) => updateField('category', e.target.value)}
              required
            >
              {CATEGORY_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          </fieldset>

          <fieldset className="fieldset">
            <legend className="fieldset-legend">SKU</legend>
            <input
              type="text"
              className="input input-bordered w-full"
              value={formData.sku}
              onChange={(e) => updateField('sku', e.target.value)}
              maxLength={100}
              placeholder="Internal or vendor SKU"
            />
          </fieldset>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6">
          <fieldset className="fieldset">
            <legend className="fieldset-legend">Unit *</legend>
            <input
              type="text"
              className="input input-bordered w-full"
              value={formData.unit}
              onChange={(e) => updateField('unit', e.target.value)}
              required
              maxLength={50}
              placeholder="each, roll, case, sheet"
            />
            <label className="label">
              <span className="label-text-alt">How you count this supply (e.g., &quot;each&quot;, &quot;roll&quot;)</span>
            </label>
          </fieldset>

          <fieldset className="fieldset">
            <legend className="fieldset-legend">Units Per Case</legend>
            <input
              type="number"
              min="1"
              className="input input-bordered w-full"
              value={formData.unitsPerCase}
              onChange={(e) => updateField('unitsPerCase', e.target.value)}
              placeholder="e.g., 100"
            />
            <label className="label">
              <span className="label-text-alt">How many individual units per purchase case</span>
            </label>
          </fieldset>
        </div>
      </div>

      <div className="space-y-0">
        <h2 className="text-xl font-semibold">Cost & Inventory</h2>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6">
          <fieldset className="fieldset">
            <legend className="fieldset-legend">Cost Per Unit</legend>
            <label className="input input-bordered w-full">
              <DollarSign className="h-4 w-4 opacity-50" />
              <input
                type="number"
                step="0.0001"
                min="0"
                className="grow"
                value={formData.costPerUnit}
                onChange={(e) => updateField('costPerUnit', parseFloat(e.target.value) || 0)}
                placeholder="0.00"
              />
            </label>
          </fieldset>

          <fieldset className="fieldset">
            <legend className="fieldset-legend">Quantity On Hand</legend>
            <input
              type="number"
              step="0.001"
              min="0"
              className="input input-bordered w-full"
              value={formData.quantityOnHand}
              onChange={(e) => updateField('quantityOnHand', parseFloat(e.target.value) || 0)}
            />
          </fieldset>
        </div>

        <fieldset className="fieldset">
          <legend className="fieldset-legend">Low Stock Threshold</legend>
          <input
            type="number"
            step="0.001"
            min="0"
            className="input input-bordered w-full"
            value={formData.lowStockThreshold}
            onChange={(e) => updateField('lowStockThreshold', e.target.value)}
            placeholder="Alert when stock falls below this"
          />
        </fieldset>
      </div>

      {vendors.length > 0 && (
        <div className="space-y-0">
          <h2 className="text-xl font-semibold">Vendors</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {vendors.map((vendor) => (
              <label key={vendor.id} className="label cursor-pointer justify-start gap-3">
                <input
                  type="checkbox"
                  className="checkbox checkbox-primary"
                  checked={formData.vendorIds.includes(vendor.id)}
                  onChange={() => toggleVendor(vendor.id)}
                />
                <span>{vendor.name}</span>
              </label>
            ))}
          </div>
        </div>
      )}

      <div className="space-y-0">
        <h2 className="text-xl font-semibold">Additional Details</h2>

        <fieldset className="fieldset">
          <legend className="fieldset-legend">Description</legend>
          <textarea
            className="textarea textarea-bordered w-full h-32"
            value={formData.description}
            onChange={(e) => updateField('description', e.target.value)}
            maxLength={2000}
            placeholder="Additional details about this supply..."
          />
        </fieldset>
      </div>

      {showBottomActions && (
        <div className="flex gap-3 justify-between pt-4">
          <div className="flex gap-3 ml-auto">
            <button type="button" className="btn btn-ghost" onClick={() => router.back()} disabled={isSubmitting}>
              Cancel
            </button>
            <button type="submit" className="btn btn-primary" disabled={isSubmitting}>
              {isSubmitting ? (
                <>
                  <span className="loading loading-spinner loading-sm"></span>
                  {supply ? 'Saving...' : 'Creating...'}
                </>
              ) : (
                supply ? 'Save Changes' : 'Create Supply'
              )}
            </button>
          </div>
        </div>
      )}
    </form>
  );
}
