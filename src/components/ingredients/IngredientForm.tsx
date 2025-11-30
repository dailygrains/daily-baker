'use client';

import { useState, useRef, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { createIngredient, updateIngredient, assignVendorToIngredient, unassignVendorFromIngredient } from '@/app/actions/ingredient';
import { VendorAutocomplete } from '@/components/vendor/VendorAutocomplete';
import { X } from 'lucide-react';
import { useToast } from '@/contexts/ToastContext';

interface Vendor {
  id: string;
  name: string;
}

interface IngredientFormProps {
  bakeryId: string;
  ingredient?: {
    id: string;
    name: string;
    description?: string | null;
    category?: string | null;
    defaultUnit: string;
    reorderLevel?: number | null;
    vendors: Array<{
      vendor: Vendor;
    }>;
  };
  onFormRefChange?: (ref: HTMLFormElement | null) => void;
  onSavingChange?: (isSaving: boolean) => void;
  onUnsavedChangesChange?: (hasChanges: boolean) => void;
  showBottomActions?: boolean;
}

export function IngredientForm({
  bakeryId,
  ingredient,
  onFormRefChange,
  onSavingChange,
  onUnsavedChangesChange,
  showBottomActions = true,
}: IngredientFormProps) {
  const router = useRouter();
  const { showToast } = useToast();
  const formRef = useRef<HTMLFormElement>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [assignedVendors, setAssignedVendors] = useState<Vendor[]>(
    ingredient?.vendors?.map((iv) => iv.vendor) ?? []
  );
  const [isAssigningVendor, setIsAssigningVendor] = useState(false);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);

  const [formData, setFormData] = useState({
    name: ingredient?.name ?? '',
    description: ingredient?.description ?? '',
    category: ingredient?.category ?? '',
    defaultUnit: ingredient?.defaultUnit ?? '',
    reorderLevel: ingredient?.reorderLevel ?? '',
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

  const handleInputChange = () => {
    setHasUnsavedChanges(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError(null);

    try {
      const payload = {
        ...formData,
        description: formData.description || undefined,
        category: formData.category || undefined,
        reorderLevel: formData.reorderLevel ? parseFloat(formData.reorderLevel as string) : undefined,
      };

      const result = ingredient
        ? await updateIngredient({
            id: ingredient.id,
            ...payload,
          })
        : await createIngredient({
            bakeryId,
            ...payload,
          });

      if (result.success) {
        const message = ingredient
          ? `Ingredient "${formData.name}" updated successfully`
          : `Ingredient "${formData.name}" created successfully`;

        showToast(message, 'success');
        setHasUnsavedChanges(false);

        // Only redirect to list after creating, stay on page after editing
        if (!ingredient) {
          router.push('/dashboard/ingredients');
        }
        router.refresh();
      } else {
        const errorMessage = result.error || 'Failed to save ingredient';
        setError(errorMessage);
        showToast(errorMessage, 'error');
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'An error occurred';
      setError(errorMessage);
      showToast(errorMessage, 'error');
    } finally {
      setIsSubmitting(false);
    }
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
        const errorMessage = result.error || 'Failed to assign vendor';
        setError(errorMessage);
        showToast(errorMessage, 'error');
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'An error occurred';
      setError(errorMessage);
      showToast(errorMessage, 'error');
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
        const errorMessage = result.error || 'Failed to remove vendor';
        setError(errorMessage);
        showToast(errorMessage, 'error');
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'An error occurred';
      setError(errorMessage);
      showToast(errorMessage, 'error');
    }
  };

  return (
    <form ref={formRef} onSubmit={handleSubmit} onChange={handleInputChange} className="max-w-3xl mx-auto space-y-8">
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
            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
            required
            maxLength={100}
            placeholder="e.g., All-Purpose Flour"
          />
        </fieldset>

        <fieldset className="fieldset">
          <legend className="fieldset-legend">Description</legend>
          <textarea
            className="textarea textarea-bordered w-full"
            value={formData.description}
            onChange={(e) => setFormData({ ...formData, description: e.target.value })}
            maxLength={1000}
            rows={3}
            placeholder="Optional description or notes about this ingredient..."
          />
        </fieldset>

        <fieldset className="fieldset">
          <legend className="fieldset-legend">Category</legend>
          <input
            type="text"
            className="input input-bordered w-full"
            value={formData.category}
            onChange={(e) => setFormData({ ...formData, category: e.target.value })}
            maxLength={50}
            placeholder="e.g., Flour, Dairy, Sweeteners"
          />
          <label className="label">
            <span className="label-text-alt">Organize ingredients by type</span>
          </label>
        </fieldset>
      </div>

      <div className="space-y-0">
        <h2 className="text-xl font-semibold">Recipe & Inventory Settings</h2>

        <fieldset className="fieldset">
          <legend className="fieldset-legend">Default Unit *</legend>
          <select
            className="select select-bordered w-full"
            value={formData.defaultUnit}
            onChange={(e) => setFormData({ ...formData, defaultUnit: e.target.value })}
            required
          >
            <option value="">Select default unit</option>
            <option value="g">Grams (g)</option>
            <option value="kg">Kilograms (kg)</option>
            <option value="ml">Milliliters (ml)</option>
            <option value="l">Liters (l)</option>
            <option value="oz">Ounces (oz)</option>
            <option value="lb">Pounds (lb)</option>
            <option value="cup">Cups</option>
            <option value="tbsp">Tablespoons</option>
            <option value="tsp">Teaspoons</option>
            <option value="unit">Units</option>
          </select>
          <label className="label">
            <span className="label-text-alt">Standard unit used in recipes for this ingredient</span>
          </label>
        </fieldset>

        <fieldset className="fieldset">
          <legend className="fieldset-legend">Reorder Level</legend>
          <input
            type="number"
            step="0.001"
            min="0"
            className="input input-bordered w-full"
            value={formData.reorderLevel}
            onChange={(e) => setFormData({ ...formData, reorderLevel: e.target.value })}
            placeholder="e.g., 1000"
          />
          <label className="label">
            <span className="label-text-alt">Alert when total inventory falls below this amount (in default units)</span>
          </label>
        </fieldset>
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
            />
            <label className="label">
              <span className="label-text-alt">
                Link this ingredient to vendors who supply it
              </span>
            </label>
          </fieldset>

          {assignedVendors.length > 0 && (
            <fieldset className="fieldset">
              <legend className="fieldset-legend">Assigned Vendors</legend>
              <div className="space-y-2">
                {assignedVendors.map((vendor) => (
                  <div
                    key={vendor.id}
                    className="flex items-center justify-between p-3 bg-base-200 rounded-lg"
                  >
                    <div>
                      <div className="font-medium">{vendor.name}</div>
                    </div>
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
