'use client';

import { useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { createProductionSheet, updateProductionSheet } from '@/app/actions/productionSheet';
import { AlertTriangle, Plus, Trash2, GripVertical } from 'lucide-react';

type Recipe = {
  id: string;
  name: string;
  totalCost: number | null;
  yieldQty: number;
  yieldUnit: string;
};

type InventoryWarning = {
  ingredientId: string;
  ingredientName: string;
  required: number;
  available: number;
  shortfall: number;
  unit: string;
};

type RecipeEntry = {
  recipeId: string;
  scale: number;
  order: number;
};

type ProductionSheetFormProps = {
  bakeryId: string;
  recipes: Recipe[];
  // For edit mode
  existingSheet?: {
    id: string;
    description: string | null;
    scheduledFor: Date | null;
    notes: string | null;
    recipes: Array<{
      recipeId: string;
      scale: number;
      order: number;
    }>;
  };
};

export function ProductionSheetForm({ bakeryId, recipes, existingSheet }: ProductionSheetFormProps) {
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [warnings, setWarnings] = useState<InventoryWarning[] | null>(null);

  // Form state
  const [description, setDescription] = useState(existingSheet?.description || '');
  const [scheduledFor, setScheduledFor] = useState(
    existingSheet?.scheduledFor
      ? new Date(existingSheet.scheduledFor).toISOString().slice(0, 16)
      : ''
  );
  const [notes, setNotes] = useState(existingSheet?.notes || '');
  const [recipeEntries, setRecipeEntries] = useState<RecipeEntry[]>(
    existingSheet?.recipes.length
      ? existingSheet.recipes.map((r, idx) => ({
          recipeId: r.recipeId,
          scale: r.scale,
          order: r.order ?? idx,
        }))
      : []
  );

  // Add a new recipe entry
  const addRecipeEntry = useCallback(() => {
    setRecipeEntries((prev) => [
      ...prev,
      {
        recipeId: '',
        scale: 1,
        order: prev.length,
      },
    ]);
  }, []);

  // Remove a recipe entry
  const removeRecipeEntry = useCallback((index: number) => {
    setRecipeEntries((prev) => prev.filter((_, i) => i !== index));
  }, []);

  // Update a recipe entry
  const updateRecipeEntry = useCallback(
    (index: number, field: 'recipeId' | 'scale', value: string | number) => {
      setRecipeEntries((prev) =>
        prev.map((entry, i) =>
          i === index ? { ...entry, [field]: value } : entry
        )
      );
    },
    []
  );

  // Move recipe entry up/down
  const moveRecipeEntry = useCallback((index: number, direction: 'up' | 'down') => {
    setRecipeEntries((prev) => {
      const newEntries = [...prev];
      const targetIndex = direction === 'up' ? index - 1 : index + 1;
      if (targetIndex < 0 || targetIndex >= newEntries.length) return prev;

      [newEntries[index], newEntries[targetIndex]] = [
        newEntries[targetIndex],
        newEntries[index],
      ];

      // Update order values
      return newEntries.map((entry, i) => ({ ...entry, order: i }));
    });
  }, []);

  // Calculate totals
  const totalEstimatedCost = recipeEntries.reduce((sum, entry) => {
    const recipe = recipes.find((r) => r.id === entry.recipeId);
    if (!recipe?.totalCost) return sum;
    return sum + Number(recipe.totalCost) * entry.scale;
  }, 0);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError(null);
    setWarnings(null);
    setIsSubmitting(true);

    // Validate at least one recipe
    const validEntries = recipeEntries.filter((r) => r.recipeId);
    if (validEntries.length === 0) {
      setError('Please add at least one recipe');
      setIsSubmitting(false);
      return;
    }

    const data = {
      bakeryId,
      description: description || null,
      scheduledFor: scheduledFor ? new Date(scheduledFor) : null,
      notes: notes || null,
      recipes: validEntries.map((r, idx) => ({
        recipeId: r.recipeId,
        scale: r.scale,
        order: idx,
      })),
    };

    let result;
    if (existingSheet) {
      result = await updateProductionSheet({
        id: existingSheet.id,
        ...data,
      });
    } else {
      result = await createProductionSheet(data);
    }

    if (result.success) {
      // Show warnings briefly if any, then redirect
      const warnings = 'warnings' in result ? result.warnings as InventoryWarning[] | undefined : undefined;
      if (warnings && warnings.length > 0) {
        setWarnings(warnings);
        setIsSubmitting(false);
        // Auto-redirect after showing warnings
        setTimeout(() => {
          router.push('/dashboard/production-sheets');
          router.refresh();
        }, 3000);
      } else {
        router.push('/dashboard/production-sheets');
        router.refresh();
      }
    } else {
      setError(result.error || 'Failed to save production sheet');
      setIsSubmitting(false);
    }
  };

  // Get available recipes (not already selected)
  const getAvailableRecipes = (currentRecipeId: string) => {
    const selectedIds = new Set(recipeEntries.map((r) => r.recipeId));
    return recipes.filter((r) => r.id === currentRecipeId || !selectedIds.has(r.id));
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {error && (
        <div className="alert alert-error">
          <span>{error}</span>
        </div>
      )}

      {warnings && warnings.length > 0 && (
        <div className="alert alert-warning">
          <AlertTriangle className="h-5 w-5" />
          <div>
            <h3 className="font-bold">
              Production sheet {existingSheet ? 'updated' : 'created'} with inventory warnings
            </h3>
            <p className="text-sm mb-2">Redirecting to production sheets list...</p>
            <ul className="text-sm list-disc list-inside">
              {warnings.map((w) => (
                <li key={w.ingredientId}>
                  <strong>{w.ingredientName}</strong>: need {w.required.toFixed(2)} {w.unit}, have{' '}
                  {w.available.toFixed(2)} {w.unit} (short {w.shortfall.toFixed(2)})
                </li>
              ))}
            </ul>
          </div>
        </div>
      )}

      {/* Description */}
      <div className="form-control">
        <label className="label">
          <span className="label-text">Description (Optional)</span>
        </label>
        <input
          type="text"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          className="input input-bordered"
          placeholder="e.g., Morning bread production, Weekend pastries"
        />
        <label className="label">
          <span className="label-text-alt text-base-content/70">
            A short description for this production sheet
          </span>
        </label>
      </div>

      {/* Scheduled For */}
      <div className="form-control">
        <label className="label">
          <span className="label-text">Scheduled For (Optional)</span>
        </label>
        <input
          type="datetime-local"
          value={scheduledFor}
          onChange={(e) => setScheduledFor(e.target.value)}
          className="input input-bordered"
        />
        <label className="label">
          <span className="label-text-alt text-base-content/70">
            When this production is planned to start
          </span>
        </label>
      </div>

      {/* Recipes Section */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold">Recipes</h3>
          <button
            type="button"
            className="btn btn-sm btn-primary"
            onClick={addRecipeEntry}
            disabled={recipeEntries.length >= recipes.length}
          >
            <Plus className="h-4 w-4" />
            Add Recipe
          </button>
        </div>

        {recipeEntries.length === 0 ? (
          <div className="text-center py-8 border-2 border-dashed border-base-300 rounded-lg">
            <p className="text-base-content/60 mb-4">No recipes added yet</p>
            <button
              type="button"
              className="btn btn-primary btn-sm"
              onClick={addRecipeEntry}
            >
              <Plus className="h-4 w-4" />
              Add Your First Recipe
            </button>
          </div>
        ) : (
          <div className="space-y-3">
            {recipeEntries.map((entry, index) => {
              const selectedRecipe = recipes.find((r) => r.id === entry.recipeId);
              const scaledYield = selectedRecipe
                ? selectedRecipe.yieldQty * entry.scale
                : 0;

              return (
                <div
                  key={index}
                  className="flex items-center gap-3 p-3 bg-base-200 rounded-lg"
                >
                  {/* Drag handle / order controls */}
                  <div className="flex flex-col gap-1">
                    <button
                      type="button"
                      className="btn btn-ghost btn-xs"
                      onClick={() => moveRecipeEntry(index, 'up')}
                      disabled={index === 0}
                    >
                      <GripVertical className="h-4 w-4" />
                    </button>
                  </div>

                  {/* Recipe selector */}
                  <div className="form-control flex-1">
                    <select
                      className="select select-bordered select-sm"
                      value={entry.recipeId}
                      onChange={(e) => updateRecipeEntry(index, 'recipeId', e.target.value)}
                      required
                    >
                      <option value="">Select a recipe</option>
                      {getAvailableRecipes(entry.recipeId).map((recipe) => (
                        <option key={recipe.id} value={recipe.id}>
                          {recipe.name} ({recipe.yieldQty} {recipe.yieldUnit})
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Scale input */}
                  <div className="form-control w-24">
                    <input
                      type="number"
                      step="0.01"
                      min="0.01"
                      max="100"
                      value={entry.scale}
                      onChange={(e) =>
                        updateRecipeEntry(index, 'scale', parseFloat(e.target.value) || 1)
                      }
                      className="input input-bordered input-sm"
                      placeholder="Scale"
                      required
                    />
                  </div>

                  {/* Scaled yield display */}
                  {selectedRecipe && (
                    <div className="text-sm text-base-content/70 w-32 hidden sm:block">
                      = {scaledYield.toFixed(1)} {selectedRecipe.yieldUnit}
                    </div>
                  )}

                  {/* Remove button */}
                  <button
                    type="button"
                    className="btn btn-ghost btn-sm btn-square text-error"
                    onClick={() => removeRecipeEntry(index)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              );
            })}
          </div>
        )}

        {/* Total cost estimate */}
        {totalEstimatedCost > 0 && (
          <div className="text-right text-sm text-base-content/70">
            Estimated Total Cost:{' '}
            <span className="font-semibold">${totalEstimatedCost.toFixed(2)}</span>
          </div>
        )}
      </div>

      {/* Notes */}
      <div className="form-control">
        <label className="label">
          <span className="label-text">Notes (Optional)</span>
        </label>
        <textarea
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          className="textarea textarea-bordered h-24"
          placeholder="Add any notes about this production sheet..."
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
          disabled={isSubmitting || recipeEntries.filter((r) => r.recipeId).length === 0}
        >
          {isSubmitting ? (
            <>
              <span className="loading loading-spinner loading-sm"></span>
              {existingSheet ? 'Saving...' : 'Creating...'}
            </>
          ) : existingSheet ? (
            'Save Changes'
          ) : (
            'Create Production Sheet'
          )}
        </button>
      </div>
    </form>
  );
}
