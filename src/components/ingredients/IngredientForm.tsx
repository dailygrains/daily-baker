'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { createIngredient, updateIngredient } from '@/app/actions/ingredient';
import type { Ingredient, Vendor } from '@prisma/client';

interface IngredientFormProps {
  bakeryId: string;
  ingredient?: Ingredient & { vendor: Vendor | null };
  vendors?: Array<{ id: string; name: string }>;
}

export function IngredientForm({ bakeryId, ingredient, vendors = [] }: IngredientFormProps) {
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [formData, setFormData] = useState({
    name: ingredient?.name ?? '',
    currentQty: ingredient ? Number(ingredient.currentQty) : 0,
    unit: ingredient?.unit ?? '',
    costPerUnit: ingredient ? Number(ingredient.costPerUnit) : 0,
    vendorId: ingredient?.vendorId ?? '',
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError(null);

    try {
      const result = ingredient
        ? await updateIngredient({
            id: ingredient.id,
            ...formData,
            vendorId: formData.vendorId || null,
          })
        : await createIngredient({
            bakeryId,
            ...formData,
            vendorId: formData.vendorId || null,
          });

      if (result.success) {
        router.push('/dashboard/ingredients');
        router.refresh();
      } else {
        setError(result.error || 'Failed to save ingredient');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {error && (
        <div className="alert alert-error">
          <span>{error}</span>
        </div>
      )}

      <div className="form-control">
        <label className="label">
          <span className="label-text">Ingredient Name</span>
        </label>
        <input
          type="text"
          className="input input-bordered"
          value={formData.name}
          onChange={(e) => setFormData({ ...formData, name: e.target.value })}
          required
          maxLength={100}
          placeholder="e.g., All-Purpose Flour"
        />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="form-control">
          <label className="label">
            <span className="label-text">Current Quantity</span>
          </label>
          <input
            type="number"
            step="0.001"
            min="0"
            className="input input-bordered"
            value={formData.currentQty}
            onChange={(e) =>
              setFormData({ ...formData, currentQty: parseFloat(e.target.value) || 0 })
            }
            required
          />
        </div>

        <div className="form-control">
          <label className="label">
            <span className="label-text">Unit</span>
          </label>
          <select
            className="select select-bordered"
            value={formData.unit}
            onChange={(e) => setFormData({ ...formData, unit: e.target.value })}
            required
          >
            <option value="">Select unit</option>
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
        </div>
      </div>

      <div className="form-control">
        <label className="label">
          <span className="label-text">Cost per Unit</span>
        </label>
        <div className="relative">
          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-base-content/50">
            $
          </span>
          <input
            type="number"
            step="0.01"
            min="0"
            className="input input-bordered pl-8"
            value={formData.costPerUnit}
            onChange={(e) =>
              setFormData({ ...formData, costPerUnit: parseFloat(e.target.value) || 0 })
            }
            required
            placeholder="0.00"
          />
        </div>
        <label className="label">
          <span className="label-text-alt">Price per single unit (e.g., per gram)</span>
        </label>
      </div>

      <div className="form-control">
        <label className="label">
          <span className="label-text">Vendor (Optional)</span>
        </label>
        <select
          className="select select-bordered"
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
        <label className="label">
          <span className="label-text-alt">
            Link this ingredient to a vendor for easier tracking
          </span>
        </label>
      </div>

      <div className="flex gap-3 justify-end">
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
              Saving...
            </>
          ) : ingredient ? (
            'Update Ingredient'
          ) : (
            'Create Ingredient'
          )}
        </button>
      </div>
    </form>
  );
}
