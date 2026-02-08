'use client';

import { useState, useRef, useEffect } from 'react';
import { updateInventoryLot } from '@/app/actions/inventory';
import { useFormSubmit } from '@/hooks/useFormSubmit';
import { formatDistanceToNow } from 'date-fns';
import { formatQuantity, formatCurrency } from '@/lib/format';

interface Vendor {
  id: string;
  name: string;
}

interface Lot {
  id: string;
  purchaseQty: number;
  remainingQty: number;
  purchaseUnit: string;
  costPerUnit: number;
  purchasedAt: Date;
  expiresAt: Date | null;
  notes: string | null;
  vendor: Vendor | null;
  ingredient: {
    id: string;
    name: string;
    unit: string;
  };
}

interface EditLotFormProps {
  lot: Lot;
  vendors: Vendor[];
  onFormRefChange?: (ref: HTMLFormElement | null) => void;
  onSavingChange?: (isSaving: boolean) => void;
}

export function EditLotForm({
  lot,
  vendors,
  onFormRefChange,
  onSavingChange,
}: EditLotFormProps) {
  const formRef = useRef<HTMLFormElement>(null);
  const { submit, isSubmitting, error } = useFormSubmit({
    mode: 'edit',
    entityName: 'Lot',
    listPath: `/dashboard/ingredients/${lot.ingredient.id}`,
  });

  const [formData, setFormData] = useState({
    expiresAt: lot.expiresAt
      ? new Date(lot.expiresAt).toISOString().split('T')[0]
      : '',
    vendorId: lot.vendor?.id || '',
    notes: lot.notes || '',
  });

  useEffect(() => {
    if (onFormRefChange && formRef.current) {
      onFormRefChange(formRef.current);
    }
  }, [onFormRefChange]);

  useEffect(() => {
    if (onSavingChange) {
      onSavingChange(isSubmitting);
    }
  }, [isSubmitting, onSavingChange]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    await submit(() =>
      updateInventoryLot({
        id: lot.id,
        expiresAt: formData.expiresAt ? new Date(formData.expiresAt) : null,
        vendorId: formData.vendorId || null,
        notes: formData.notes || null,
      })
    );
  };

  return (
    <form ref={formRef} onSubmit={handleSubmit} className="space-y-6">
      {error && (
        <div className="alert alert-error">
          <span>{error}</span>
        </div>
      )}

      {/* Read-only purchase info */}
      <div className="card bg-base-100 shadow-xl">
        <div className="card-body">
          <h2 className="card-title">Purchase Details</h2>
          <p className="text-sm text-base-content/60">
            These fields cannot be edited as they affect inventory calculations.
          </p>

          <div className="grid grid-cols-2 gap-4 mt-4">
            <div>
              <p className="text-sm text-base-content/70">Ingredient</p>
              <p className="font-semibold">{lot.ingredient.name}</p>
            </div>

            <div>
              <p className="text-sm text-base-content/70">Purchase Date</p>
              <p className="font-semibold">
                {formatDistanceToNow(new Date(lot.purchasedAt), { addSuffix: true })}
              </p>
            </div>

            <div>
              <p className="text-sm text-base-content/70">Original Quantity</p>
              <p className="font-semibold">
                {formatQuantity(lot.purchaseQty)} {lot.purchaseUnit}
              </p>
            </div>

            <div>
              <p className="text-sm text-base-content/70">Remaining Quantity</p>
              <p className="font-semibold">
                {formatQuantity(lot.remainingQty)} {lot.purchaseUnit}
              </p>
            </div>

            <div>
              <p className="text-sm text-base-content/70">Cost per Unit</p>
              <p className="font-semibold">
                {formatCurrency(lot.costPerUnit)}/{lot.purchaseUnit}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Editable fields */}
      <div className="card bg-base-100 shadow-xl">
        <div className="card-body">
          <h2 className="card-title">Editable Information</h2>

          <fieldset className="fieldset">
            <legend className="fieldset-legend">Vendor</legend>
            <select
              className="select select-bordered w-full"
              value={formData.vendorId}
              onChange={(e) => setFormData({ ...formData, vendorId: e.target.value })}
            >
              <option value="">No vendor</option>
              {vendors.map((vendor) => (
                <option key={vendor.id} value={vendor.id}>
                  {vendor.name}
                </option>
              ))}
            </select>
          </fieldset>

          <fieldset className="fieldset">
            <legend className="fieldset-legend">Expiration Date</legend>
            <input
              type="date"
              className="input input-bordered w-full"
              value={formData.expiresAt}
              onChange={(e) => setFormData({ ...formData, expiresAt: e.target.value })}
            />
          </fieldset>

          <fieldset className="fieldset">
            <legend className="fieldset-legend">Notes</legend>
            <textarea
              className="textarea textarea-bordered w-full"
              value={formData.notes}
              onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              placeholder="Invoice number, batch info, etc."
              rows={3}
            />
          </fieldset>
        </div>
      </div>
    </form>
  );
}
