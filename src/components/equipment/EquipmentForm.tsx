'use client';

import { useState, useRef, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { createEquipment, updateEquipment } from '@/app/actions/equipment';
import { useFormSubmit } from '@/hooks/useFormSubmit';
import type { Equipment, EquipmentStatus } from '@/generated/prisma';
import { DollarSign } from 'lucide-react';

interface EquipmentFormProps {
  bakeryId: string;
  equipment?: Omit<Equipment, 'cost'> & { cost: number | null } & { vendor: { id: string; name: string; email: string | null; phone: string | null } | null };
  vendors?: Array<{ id: string; name: string }>;
  onFormRefChange?: (ref: HTMLFormElement | null) => void;
  onSavingChange?: (isSaving: boolean) => void;
  onUnsavedChangesChange?: (hasChanges: boolean) => void;
  showBottomActions?: boolean;
}

export function EquipmentForm({
  bakeryId,
  equipment,
  vendors = [],
  onFormRefChange,
  onSavingChange,
  onUnsavedChangesChange,
  showBottomActions = true,
}: EquipmentFormProps) {
  const router = useRouter();
  const formRef = useRef<HTMLFormElement>(null);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);

  const { submit, isSubmitting, error } = useFormSubmit({
    mode: equipment ? 'edit' : 'create',
    entityName: 'Equipment',
    listPath: '/dashboard/equipment',
    onSuccess: () => setHasUnsavedChanges(false),
  });

  const [formData, setFormData] = useState<{
    name: string;
    status: EquipmentStatus;
    vendorId: string;
    purchaseDate: string;
    cost: number;
    quantity: number;
    serialNumber: string;
    notes: string;
  }>({
    name: equipment?.name ?? '',
    status: equipment?.status ?? 'CONSIDERING',
    vendorId: equipment?.vendorId ?? '',
    purchaseDate: equipment?.purchaseDate
      ? new Date(equipment.purchaseDate).toISOString().split('T')[0]
      : '',
    cost: equipment?.cost ? Number(equipment.cost) : 0,
    quantity: equipment?.quantity ?? 1,
    serialNumber: equipment?.serialNumber ?? '',
    notes: equipment?.notes ?? '',
  });

  // Notify parent of form ref changes
  useEffect(() => {
    if (onFormRefChange && formRef.current) {
      onFormRefChange(formRef.current);
    }
  }, [onFormRefChange]);

  // Notify parent of saving state changes
  useEffect(() => {
    if (onSavingChange) {
      onSavingChange(isSubmitting);
    }
  }, [isSubmitting, onSavingChange]);

  // Notify parent of unsaved changes state
  useEffect(() => {
    if (onUnsavedChangesChange) {
      onUnsavedChangesChange(hasUnsavedChanges);
    }
  }, [hasUnsavedChanges, onUnsavedChangesChange]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    await submit(
      () =>
        equipment
          ? updateEquipment({
              id: equipment.id,
              ...formData,
              vendorId: formData.vendorId || null,
              purchaseDate: formData.purchaseDate ? new Date(formData.purchaseDate) : null,
              cost: formData.cost || null,
              serialNumber: formData.serialNumber || null,
              notes: formData.notes || null,
            })
          : createEquipment({
              bakeryId,
              ...formData,
              vendorId: formData.vendorId || null,
              purchaseDate: formData.purchaseDate ? new Date(formData.purchaseDate) : null,
              cost: formData.cost || null,
              serialNumber: formData.serialNumber || null,
              notes: formData.notes || null,
            }),
      formData.name
    );
  };

  const updateField = (field: string, value: string | number) => {
    setFormData({ ...formData, [field]: value });
    setHasUnsavedChanges(true);
  };

  return (
    <form ref={formRef} onSubmit={handleSubmit} className="space-y-8">
      {error && (
        <div className="alert alert-error">
          <svg xmlns="http://www.w3.org/2000/svg" className="stroke-current shrink-0 h-6 w-6" fill="none" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <span>{error}</span>
        </div>
      )}

      <div className="space-y-0">
        <h2 className="text-xl font-semibold">Basic Information</h2>

        <fieldset className="fieldset">
          <legend className="fieldset-legend">Equipment Name *</legend>
          <input
            type="text"
            className="input input-bordered w-full"
            value={formData.name}
            onChange={(e) => updateField('name', e.target.value)}
            required
            maxLength={200}
            placeholder="e.g., Commercial Oven"
          />
        </fieldset>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6">
          <fieldset className="fieldset">
            <legend className="fieldset-legend">Status *</legend>
            <select
              className="select select-bordered w-full"
              value={formData.status}
              onChange={(e) => updateField('status', e.target.value)}
              required
            >
              <option value="CONSIDERING">Considering</option>
              <option value="ORDERED">Ordered</option>
              <option value="RECEIVED">Received</option>
              <option value="IN_USE">In Use</option>
              <option value="MAINTENANCE">Maintenance</option>
              <option value="RETIRED">Retired</option>
            </select>
          </fieldset>

          <fieldset className="fieldset">
            <legend className="fieldset-legend">Quantity *</legend>
            <input
              type="number"
              min="1"
              className="input input-bordered w-full"
              value={formData.quantity}
              onChange={(e) => updateField('quantity', parseInt(e.target.value) || 1)}
              required
            />
          </fieldset>
        </div>
      </div>

      <div className="space-y-0">
        <h2 className="text-xl font-semibold">Vendor & Purchase Details</h2>

        <fieldset className="fieldset">
          <legend className="fieldset-legend">Vendor</legend>
          <select
            className="select select-bordered w-full"
            value={formData.vendorId}
            onChange={(e) => updateField('vendorId', e.target.value)}
          >
            <option value="">No vendor</option>
            {vendors.map((vendor) => (
              <option key={vendor.id} value={vendor.id}>
                {vendor.name}
              </option>
            ))}
          </select>
        </fieldset>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6">
          <fieldset className="fieldset">
            <legend className="fieldset-legend">Purchase Date</legend>
            <input
              type="date"
              className="input input-bordered w-full"
              value={formData.purchaseDate}
              onChange={(e) => updateField('purchaseDate', e.target.value)}
            />
          </fieldset>

          <fieldset className="fieldset">
            <legend className="fieldset-legend">Cost</legend>
            <label className="input input-bordered w-full">
              <DollarSign className="h-4 w-4 opacity-50" />
              <input
                type="number"
                step="0.01"
                min="0"
                className="grow"
                value={formData.cost}
                onChange={(e) => updateField('cost', parseFloat(e.target.value) || 0)}
                placeholder="0.00"
              />
            </label>
          </fieldset>
        </div>

        <fieldset className="fieldset">
          <legend className="fieldset-legend">Serial Number</legend>
          <input
            type="text"
            className="input input-bordered w-full"
            value={formData.serialNumber}
            onChange={(e) => updateField('serialNumber', e.target.value)}
            maxLength={100}
            placeholder="Serial or model number"
          />
        </fieldset>
      </div>

      <div className="space-y-0">
        <h2 className="text-xl font-semibold">Additional Details</h2>

        <fieldset className="fieldset">
          <legend className="fieldset-legend">Notes</legend>
          <textarea
            className="textarea textarea-bordered w-full h-32"
            value={formData.notes}
            onChange={(e) => updateField('notes', e.target.value)}
            maxLength={2000}
            placeholder="Additional notes about this equipment..."
          />
          <label className="label">
            <span className="label-text-alt">
              Optional notes for internal reference
            </span>
          </label>
        </fieldset>
      </div>

      {showBottomActions && (
        <div className="flex gap-3 justify-between pt-4">
          <div className="flex gap-3 ml-auto">
            <button
              type="button"
              className="btn btn-ghost"
              onClick={() => router.back()}
              disabled={isSubmitting}
            >
              Cancel
            </button>
            <button type="submit" className="btn btn-primary" disabled={isSubmitting}>
              {isSubmitting ? (
                <>
                  <span className="loading loading-spinner loading-sm"></span>
                  {equipment ? 'Saving...' : 'Creating...'}
                </>
              ) : (
                equipment ? 'Save Changes' : 'Create Equipment'
              )}
            </button>
          </div>
        </div>
      )}
    </form>
  );
}
