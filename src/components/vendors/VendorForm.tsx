'use client';

import { useState, useRef, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { createVendor, updateVendor } from '@/app/actions/vendor';
import { useFormSubmit } from '@/hooks/useFormSubmit';
import type { Vendor } from '@/generated/prisma';

interface VendorFormProps {
  bakeryId: string;
  vendor?: Vendor;
  onFormRefChange?: (ref: HTMLFormElement | null) => void;
  onSavingChange?: (isSaving: boolean) => void;
  onUnsavedChangesChange?: (hasChanges: boolean) => void;
  showBottomActions?: boolean;
}

export function VendorForm({
  bakeryId,
  vendor,
  onFormRefChange,
  onSavingChange,
  onUnsavedChangesChange,
  showBottomActions = true,
}: VendorFormProps) {
  const router = useRouter();
  const formRef = useRef<HTMLFormElement>(null);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);

  const { submit, isSubmitting, error } = useFormSubmit({
    mode: vendor ? 'edit' : 'create',
    entityName: 'Vendor',
    listPath: '/dashboard/vendors',
    onSuccess: () => setHasUnsavedChanges(false),
  });

  const [formData, setFormData] = useState({
    name: vendor?.name ?? '',
    email: vendor?.email ?? '',
    phone: vendor?.phone ?? '',
    website: vendor?.website ?? '',
    notes: vendor?.notes ?? '',
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
        vendor
          ? updateVendor({
              id: vendor.id,
              ...formData,
              email: formData.email || null,
              phone: formData.phone || null,
              website: formData.website || null,
              notes: formData.notes || null,
            })
          : createVendor({
              bakeryId,
              ...formData,
              email: formData.email || null,
              phone: formData.phone || null,
              website: formData.website || null,
              notes: formData.notes || null,
            }),
      formData.name
    );
  };

  const updateField = (field: string, value: string) => {
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
          <legend className="fieldset-legend">Vendor Name *</legend>
          <input
            type="text"
            className="input input-bordered w-full"
            value={formData.name}
            onChange={(e) => updateField('name', e.target.value)}
            required
            maxLength={100}
            placeholder="e.g., ABC Flour Company"
          />
        </fieldset>
      </div>

      <div className="space-y-0">
        <h2 className="text-xl font-semibold">Contact Information</h2>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6">
          <fieldset className="fieldset">
            <legend className="fieldset-legend">Email</legend>
            <input
              type="email"
              className="input input-bordered w-full"
              value={formData.email}
              onChange={(e) => updateField('email', e.target.value)}
              maxLength={100}
              placeholder="contact@vendor.com"
            />
          </fieldset>

          <fieldset className="fieldset">
            <legend className="fieldset-legend">Phone</legend>
            <input
              type="tel"
              className="input input-bordered w-full"
              value={formData.phone}
              onChange={(e) => updateField('phone', e.target.value)}
              maxLength={20}
              placeholder="(555) 123-4567"
            />
          </fieldset>
        </div>

        <fieldset className="fieldset">
          <legend className="fieldset-legend">Website</legend>
          <input
            type="url"
            className="input input-bordered w-full"
            value={formData.website}
            onChange={(e) => updateField('website', e.target.value)}
            maxLength={255}
            placeholder="https://www.vendor.com"
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
            maxLength={1000}
            placeholder="Additional notes about this vendor..."
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
                  {vendor ? 'Saving...' : 'Creating...'}
                </>
              ) : (
                vendor ? 'Save Changes' : 'Create Vendor'
              )}
            </button>
          </div>
        </div>
      )}
    </form>
  );
}
