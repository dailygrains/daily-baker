'use client';

import { useState, useRef, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { createIngredient, updateIngredient, assignVendorToIngredient, unassignVendorFromIngredient } from '@/app/actions/ingredient';
import { createVendor } from '@/app/actions/vendor';
import { VendorAutocomplete } from '@/components/vendor/VendorAutocomplete';
import { TagManager } from '@/components/tags';
import { X } from 'lucide-react';
import type { Decimal } from '@prisma/client/runtime/library';
import { useFormSubmit } from '@/hooks/useFormSubmit';
import { useToastStore } from '@/store/toast-store';

interface Vendor {
  id: string;
  name: string;
}

interface Tag {
  id: string;
  name: string;
  color?: string | null;
  tagType?: {
    id: string;
    name: string;
  };
}

interface IngredientFormProps {
  bakeryId: string;
  ingredient?: {
    id: string;
    name: string;
    currentQty: number | string | Decimal;
    unit: string;
    costPerUnit: number | string | Decimal;
    lowStockThreshold: number | null;
    vendors: Array<{
      vendor: Vendor;
    }>;
    tags?: Tag[];
  };
  defaultTagTypeId?: string;
  onFormRefChange?: (ref: HTMLFormElement | null) => void;
  onSavingChange?: (isSaving: boolean) => void;
  onUnsavedChangesChange?: (hasChanges: boolean) => void;
  showBottomActions?: boolean;
}

export function IngredientForm({
  bakeryId,
  ingredient,
  defaultTagTypeId,
  onFormRefChange,
  onSavingChange,
  onUnsavedChangesChange,
  showBottomActions = true,
}: IngredientFormProps) {
  const router = useRouter();
  const showToast = useToastStore((state) => state.addToast);
  const formRef = useRef<HTMLFormElement>(null);
  const [assignedVendors, setAssignedVendors] = useState<Vendor[]>(
    ingredient?.vendors?.map((iv) => iv.vendor) ?? []
  );
  const [isAssigningVendor, setIsAssigningVendor] = useState(false);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);

  const { submit, isSubmitting, error } = useFormSubmit({
    mode: ingredient ? 'edit' : 'create',
    entityName: 'Ingredient',
    listPath: '/dashboard/ingredients',
    onSuccess: () => setHasUnsavedChanges(false),
  });

  const [formData, setFormData] = useState({
    name: ingredient?.name ?? '',
    currentQty: ingredient ? Number(ingredient.currentQty) : 0,
    unit: ingredient?.unit ?? '',
    costPerUnit: ingredient ? Number(ingredient.costPerUnit) : 0,
    lowStockThreshold: ingredient?.lowStockThreshold ?? null as number | null,
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
        ingredient
          ? updateIngredient({
              id: ingredient.id,
              ...formData,
            })
          : createIngredient({
              bakeryId,
              ...formData,
            }),
      formData.name
    );
  };

  const handleAssignVendor = async (vendor: Vendor) => {
    if (!ingredient) return;

    setIsAssigningVendor(true);
    try {
      const result = await assignVendorToIngredient(ingredient.id, vendor.id);
      if (result.success) {
        setAssignedVendors([...assignedVendors, vendor]);
        showToast(`Vendor "${vendor.name}" assigned successfully`, 'success');
        router.refresh();
      } else {
        showToast(result.error || 'Failed to assign vendor', 'error');
      }
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'An error occurred', 'error');
    } finally {
      setIsAssigningVendor(false);
    }
  };

  const handleUnassignVendor = async (vendorId: string) => {
    if (!ingredient) return;

    try {
      const vendorName = assignedVendors.find(v => v.id === vendorId)?.name || 'Vendor';
      const result = await unassignVendorFromIngredient(ingredient.id, vendorId);
      if (result.success) {
        setAssignedVendors(assignedVendors.filter((v) => v.id !== vendorId));
        showToast(`${vendorName} unassigned successfully`, 'success');
        router.refresh();
      } else {
        showToast(result.error || 'Failed to remove vendor', 'error');
      }
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'An error occurred', 'error');
    }
  };

  const handleCreateVendor = async (name: string): Promise<Vendor | null> => {
    try {
      const result = await createVendor({ bakeryId, name });
      if (result.success && result.data) {
        showToast(`Vendor "${name}" created successfully`, 'success');
        router.refresh();
        return { id: result.data.id, name: result.data.name };
      } else {
        const errorMessage = result.error || 'Failed to create vendor';
        showToast(errorMessage, 'error');
        return null;
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to create vendor';
      showToast(errorMessage, 'error');
      return null;
    }
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
          <legend className="fieldset-legend">Ingredient Name *</legend>
          <input
            type="text"
            className="input input-bordered w-full"
            value={formData.name}
            onChange={(e) => {
              setFormData({ ...formData, name: e.target.value });
              setHasUnsavedChanges(true);
            }}
            required
            maxLength={100}
            placeholder="e.g., All-Purpose Flour"
          />
        </fieldset>
      </div>

      <div className="space-y-0">
        <h2 className="text-xl font-semibold">Inventory Details</h2>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6">
          {ingredient ? (
            <fieldset className="fieldset">
              <legend className="fieldset-legend">Current Quantity</legend>
              <input
                type="text"
                className="input input-bordered w-full bg-base-200"
                value={`${formData.currentQty.toFixed(3)} ${formData.unit}`}
                disabled
              />
            </fieldset>
          ) : null}

          <fieldset className="fieldset">
            <legend className="fieldset-legend">Unit *</legend>
            <select
              className="select select-bordered w-full"
              value={formData.unit}
              onChange={(e) => {
                setFormData({ ...formData, unit: e.target.value });
                setHasUnsavedChanges(true);
              }}
              required
            >
              <option value="">Select unit</option>
              <optgroup label="Weight">
                <option value="g">Grams (g)</option>
                <option value="kg">Kilograms (kg)</option>
                <option value="oz">Ounces (oz)</option>
                <option value="lb">Pounds (lb)</option>
              </optgroup>
              <optgroup label="Volume">
                <option value="ml">Milliliters (mL)</option>
                <option value="l">Liters (L)</option>
                <option value="gal">Gallons</option>
                <option value="qt">Quarts</option>
                <option value="pint">Pints</option>
                <option value="cup">Cups</option>
                <option value="fl-oz">Fluid Ounces (fl oz)</option>
                <option value="tbsp">Tablespoons</option>
                <option value="tsp">Teaspoons</option>
              </optgroup>
              <optgroup label="Count">
                <option value="unit">Each</option>
                <option value="dozen">Dozen</option>
              </optgroup>
            </select>
          </fieldset>

          {ingredient ? (
            <fieldset className="fieldset">
              <legend className="fieldset-legend">Avg Cost per Unit</legend>
              <input
                type="text"
                className="input input-bordered w-full bg-base-200"
                value={`$${formData.costPerUnit.toFixed(2)}/${formData.unit}`}
                disabled
              />
            </fieldset>
          ) : null}
        </div>

        {ingredient && (
          <p className="text-sm text-base-content/60 mt-2">
            Quantity and cost are calculated from inventory lots.{' '}
            <Link href={`/dashboard/ingredients/${ingredient.id}`} className="link">
              Manage lots
            </Link>
          </p>
        )}

        {ingredient && (
          <fieldset className="fieldset">
            <legend className="fieldset-legend">Low Stock Alert Threshold</legend>
            <input
              type="number"
              step="0.001"
              min="0"
              className="input input-bordered w-full"
              value={formData.lowStockThreshold ?? ''}
              onChange={(e) => {
                const value = e.target.value === '' ? null : parseFloat(e.target.value);
                setFormData({ ...formData, lowStockThreshold: value });
                setHasUnsavedChanges(true);
              }}
              placeholder="Leave empty to disable"
            />
            <label className="label">
              <span className="label-text-alt">
                Show low stock warning when quantity falls below this value. Leave empty or set to 0 to disable alerts.
              </span>
            </label>
          </fieldset>
        )}
      </div>

      {ingredient && (
        <div className="space-y-0">
          <h2 className="text-xl font-semibold">Vendors</h2>

          <fieldset className="fieldset">
            <legend className="fieldset-legend">Assign Vendors</legend>
            <VendorAutocomplete
              bakeryId={bakeryId}
              onSelect={handleAssignVendor}
              excludeVendorIds={assignedVendors.map((v) => v.id)}
              placeholder="Search and assign vendors..."
              allowCreate={true}
              onCreate={handleCreateVendor}
            />
            <label className="label">
              <span className="label-text-alt">
                Link this ingredient to multiple vendors for easier tracking
              </span>
            </label>
          </fieldset>

          {assignedVendors.length > 0 && (
            <fieldset className="fieldset">
              <legend className="fieldset-legend">Assigned Vendors</legend>
              <div className="space-y-1">
                {assignedVendors.map((vendor) => (
                  <div
                    key={vendor.id}
                    className="flex items-center justify-between py-1 bg-base-200 rounded-lg"
                  >
                    <Link
                      href={`/dashboard/vendors/${vendor.id}`}
                      className="flex-1 font-medium hover:underline"
                    >
                      {vendor.name}
                    </Link>
                    <button
                      type="button"
                      onClick={() => handleUnassignVendor(vendor.id)}
                      className="btn btn-ghost btn-sm text-error"
                      disabled={isAssigningVendor}
                    >
                      <X className="h-4 w-4" />
                    </button>
                  </div>
                ))}
              </div>
            </fieldset>
          )}
        </div>
      )}

      {ingredient && (
        <div className="space-y-0">
          <h2 className="text-xl font-semibold">Tags</h2>

          <fieldset className="fieldset">
            <legend className="fieldset-legend">Assign Tags</legend>
            <TagManager
              bakeryId={bakeryId}
              entityType="ingredient"
              entityId={ingredient.id}
              initialTags={ingredient.tags || []}
              allowCreate={Boolean(defaultTagTypeId)}
              defaultTagTypeId={defaultTagTypeId}
            />
            <label className="label">
              <span className="label-text-alt">
                Add tags to categorize this ingredient (e.g., Organic, Vegan, Local)
              </span>
            </label>
          </fieldset>
        </div>
      )}

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
                  {ingredient ? 'Saving...' : 'Creating...'}
                </>
              ) : (
                ingredient ? 'Save Changes' : 'Create Ingredient'
              )}
            </button>
          </div>
        </div>
      )}
    </form>
  );
}
