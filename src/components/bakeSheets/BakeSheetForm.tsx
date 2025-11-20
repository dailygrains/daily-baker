'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { createBakeSheet } from '@/app/actions/bakeSheet';

type Recipe = {
  id: string;
  name: string;
  totalCost: number | null;
};

type BakeSheetFormProps = {
  bakeryId: string;
  recipes: Recipe[];
};

export function BakeSheetForm({ bakeryId, recipes }: BakeSheetFormProps) {
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedRecipeId, setSelectedRecipeId] = useState('');

  // Get selected recipe
  const selectedRecipe = recipes.find((r) => r.id === selectedRecipeId);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError(null);
    setIsSubmitting(true);

    const formData = new FormData(e.currentTarget);

    const data = {
      bakeryId,
      recipeId: formData.get('recipeId') as string,
      scale: parseFloat(formData.get('scale') as string),
      quantity: formData.get('quantity') as string,
      notes: (formData.get('notes') as string) || null,
    };

    const result = await createBakeSheet(data);

    if (result.success) {
      router.push('/dashboard/bake-sheets');
      router.refresh();
    } else {
      setError(result.error || 'Failed to create bake sheet');
      setIsSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {error && (
        <div className="alert alert-error">
          <span>{error}</span>
        </div>
      )}

      {/* Recipe Selection */}
      <div className="form-control">
        <label className="label">
          <span className="label-text">Recipe</span>
        </label>
        <select
          name="recipeId"
          className="select select-bordered"
          required
          value={selectedRecipeId}
          onChange={(e) => setSelectedRecipeId(e.target.value)}
        >
          <option value="">Select a recipe</option>
          {recipes.map((recipe) => (
            <option key={recipe.id} value={recipe.id}>
              {recipe.name}
              {recipe.totalCost && ` (Cost: $${Number(recipe.totalCost).toFixed(2)})`}
            </option>
          ))}
        </select>
        <label className="label">
          <span className="label-text-alt text-base-content/70">
            Choose the recipe for this bake sheet
          </span>
        </label>
      </div>

      {/* Scale */}
      <div className="form-control">
        <label className="label">
          <span className="label-text">Scale</span>
        </label>
        <input
          type="number"
          name="scale"
          step="0.01"
          min="0.01"
          max="100"
          defaultValue="1.00"
          className="input input-bordered"
          placeholder="e.g., 1.0, 2.5, 0.5"
          required
        />
        <label className="label">
          <span className="label-text-alt text-base-content/70">
            Recipe multiplier (1.0 = recipe as-is, 2.0 = double, 0.5 = half)
          </span>
        </label>
        {selectedRecipe && selectedRecipe.totalCost && (
          <label className="label">
            <span className="label-text-alt text-info">
              Estimated cost will be calculated based on scale
            </span>
          </label>
        )}
      </div>

      {/* Quantity Description */}
      <div className="form-control">
        <label className="label">
          <span className="label-text">Quantity Description</span>
        </label>
        <input
          type="text"
          name="quantity"
          className="input input-bordered"
          placeholder="e.g., 25 loaves, 50 bagels, 100 croissants"
          required
        />
        <label className="label">
          <span className="label-text-alt text-base-content/70">
            Describe what you're making (e.g., "25 loaves")
          </span>
        </label>
      </div>

      {/* Notes */}
      <div className="form-control">
        <label className="label">
          <span className="label-text">Notes (Optional)</span>
        </label>
        <textarea
          name="notes"
          className="textarea textarea-bordered h-24"
          placeholder="Add any notes about this bake sheet..."
        />
        <label className="label">
          <span className="label-text-alt text-base-content/70">
            Optional notes for this production run
          </span>
        </label>
      </div>

      {/* Form Actions */}
      <div className="flex gap-2 justify-end">
        <button
          type="button"
          className="btn btn-ghost"
          onClick={() => router.back()}
          disabled={isSubmitting}
        >
          Cancel
        </button>
        <button
          type="submit"
          className="btn btn-primary"
          disabled={isSubmitting}
        >
          {isSubmitting ? (
            <>
              <span className="loading loading-spinner loading-sm"></span>
              Creating...
            </>
          ) : (
            'Create Bake Sheet'
          )}
        </button>
      </div>
    </form>
  );
}
