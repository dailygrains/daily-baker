'use client';

import { useState, useRef, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { addInventoryLot } from '@/app/actions/inventory';
import { useToast } from '@/contexts/ToastContext';
import { DollarSign } from 'lucide-react';

interface Ingredient {
  id: string;
  name: string;
  unit: string;
}

interface Vendor {
  id: string;
  name: string;
}

interface AddLotFormProps {
  ingredients: Ingredient[];
  vendors: Vendor[];
  preselectedIngredientId?: string;
  onFormRefChange?: (ref: HTMLFormElement | null) => void;
  onSavingChange?: (isSaving: boolean) => void;
}

export function AddLotForm({
  ingredients,
  vendors,
  preselectedIngredientId,
  onFormRefChange,
  onSavingChange,
}: AddLotFormProps) {
  const router = useRouter();
  const { showToast } = useToast();
  const formRef = useRef<HTMLFormElement>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

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

  const preselectedIngredient = preselectedIngredientId
    ? ingredients.find((i) => i.id === preselectedIngredientId)
    : null;

  const [formData, setFormData] = useState({
    ingredientId: preselectedIngredientId || '',
    quantity: '',
    unit: preselectedIngredient?.unit || '',
    costPerUnit: '',
    expiresAt: '',
    vendorId: '',
    notes: '',
  });

  const handleIngredientChange = (ingredientId: string) => {
    const ingredient = ingredients.find((i) => i.id === ingredientId);
    setFormData({
      ...formData,
      ingredientId,
      unit: ingredient?.unit || formData.unit,
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError(null);

    try {
      const result = await addInventoryLot({
        ingredientId: formData.ingredientId,
        quantity: parseFloat(formData.quantity),
        unit: formData.unit,
        costPerUnit: parseFloat(formData.costPerUnit),
        expiresAt: formData.expiresAt ? new Date(formData.expiresAt) : null,
        vendorId: formData.vendorId || null,
        notes: formData.notes || null,
      });

      if (result.success) {
        showToast('Inventory lot added successfully', 'success');
        router.push(`/dashboard/ingredients/${formData.ingredientId}`);
        router.refresh();
      } else {
        setError(result.error || 'Failed to add inventory lot');
        showToast(result.error || 'Failed to add inventory lot', 'error');
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'An error occurred';
      setError(errorMessage);
      showToast(errorMessage, 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <form ref={formRef} onSubmit={handleSubmit} className="space-y-6">
      {error && (
        <div className="alert alert-error">
          <span>{error}</span>
        </div>
      )}

      <div className="card bg-base-100 shadow-xl">
        <div className="card-body">
          <h2 className="card-title">Purchase Details</h2>

          <fieldset className="fieldset">
            <legend className="fieldset-legend">Ingredient *</legend>
            <select
              className="select select-bordered w-full"
              value={formData.ingredientId}
              onChange={(e) => handleIngredientChange(e.target.value)}
              required
            >
              <option value="">Select ingredient</option>
              {ingredients.map((ingredient) => (
                <option key={ingredient.id} value={ingredient.id}>
                  {ingredient.name}
                </option>
              ))}
            </select>
          </fieldset>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <fieldset className="fieldset">
              <legend className="fieldset-legend">Quantity *</legend>
              <input
                type="number"
                step="0.001"
                min="0.001"
                className="input input-bordered w-full"
                value={formData.quantity}
                onChange={(e) => setFormData({ ...formData, quantity: e.target.value })}
                required
                placeholder="0.000"
              />
            </fieldset>

            <fieldset className="fieldset">
              <legend className="fieldset-legend">Unit *</legend>
              <select
                className="select select-bordered w-full"
                value={formData.unit}
                onChange={(e) => setFormData({ ...formData, unit: e.target.value })}
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
          </div>

          <fieldset className="fieldset">
            <legend className="fieldset-legend">Cost per Unit *</legend>
            <label className="input input-bordered w-full">
              <DollarSign className="h-4 w-4 opacity-50" />
              <input
                type="number"
                step="0.01"
                min="0"
                className="grow"
                value={formData.costPerUnit}
                onChange={(e) => setFormData({ ...formData, costPerUnit: e.target.value })}
                required
                placeholder="0.00"
              />
            </label>
            <label className="label">
              <span className="label-text-alt">
                Price per {formData.unit || 'unit'} for this purchase
              </span>
            </label>
          </fieldset>
        </div>
      </div>

      <div className="card bg-base-100 shadow-xl">
        <div className="card-body">
          <h2 className="card-title">Additional Information</h2>

          <fieldset className="fieldset">
            <legend className="fieldset-legend">Vendor</legend>
            <select
              className="select select-bordered w-full"
              value={formData.vendorId}
              onChange={(e) => setFormData({ ...formData, vendorId: e.target.value })}
            >
              <option value="">Select vendor (optional)</option>
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
