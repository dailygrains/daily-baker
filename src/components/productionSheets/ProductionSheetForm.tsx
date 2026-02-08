'use client';

import { useState, useCallback, useRef, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { createProductionSheet, updateProductionSheet } from '@/app/actions/productionSheet';
import { AlertTriangle, Plus, Trash2, GripVertical } from 'lucide-react';
import { formatQuantity, formatCurrency } from '@/lib/format';
import { useToast } from '@/contexts/ToastContext';
import { RecipeAutocomplete } from '@/components/productionSheets/RecipeAutocomplete';

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
  onFormRefChange?: (ref: HTMLFormElement | null) => void;
  onSavingChange?: (isSaving: boolean) => void;
  onUnsavedChangesChange?: (hasChanges: boolean) => void;
  showBottomActions?: boolean;
};

export function ProductionSheetForm({
  bakeryId,
  recipes,
  existingSheet,
  onFormRefChange,
  onSavingChange,
  onUnsavedChangesChange,
  showBottomActions = true,
}: ProductionSheetFormProps) {
  const router = useRouter();
  const { showToast } = useToast();
  const formRef = useRef<HTMLFormElement>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [warnings, setWarnings] = useState<InventoryWarning[] | null>(null);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);

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

  // Mark form as having unsaved changes
  const markUnsaved = useCallback(() => {
    setHasUnsavedChanges(true);
  }, []);

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
    markUnsaved();
  }, [markUnsaved]);

  // Remove a recipe entry
  const removeRecipeEntry = useCallback((index: number) => {
    setRecipeEntries((prev) => prev.filter((_, i) => i !== index));
    markUnsaved();
  }, [markUnsaved]);

  // Update a recipe entry
  const updateRecipeEntry = useCallback(
    (index: number, field: 'recipeId' | 'scale', value: string | number) => {
      setRecipeEntries((prev) =>
        prev.map((entry, i) =>
          i === index ? { ...entry, [field]: value } : entry
        )
      );
      markUnsaved();
    },
    [markUnsaved]
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
    markUnsaved();
  }, [markUnsaved]);

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

    try {
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
        const sheetName = description || 'Production sheet';
        const message = existingSheet
          ? `"${sheetName}" updated successfully`
          : `"${sheetName}" created successfully`;

        setHasUnsavedChanges(false);

        // Show warnings briefly if any, then redirect
        const resultWarnings = 'warnings' in result ? result.warnings as InventoryWarning[] | undefined : undefined;
        if (resultWarnings && resultWarnings.length > 0) {
          setWarnings(resultWarnings);
          setIsSubmitting(false);
          showToast(message, 'success');
          // Auto-redirect after showing warnings
          setTimeout(() => {
            router.push('/dashboard/production-sheets');
            router.refresh();
          }, 3000);
        } else {
          showToast(message, 'success');
          // Only redirect to list after creating, stay on page after editing
          if (!existingSheet) {
            router.push('/dashboard/production-sheets');
          }
          router.refresh();
        }
      } else {
        const errorMessage = result.error || 'Failed to save production sheet';
        setError(errorMessage);
        showToast(errorMessage, 'error');
        setIsSubmitting(false);
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'An error occurred';
      setError(errorMessage);
      showToast(errorMessage, 'error');
      setIsSubmitting(false);
    }
  };

  return (
    <form ref={formRef} onSubmit={handleSubmit} className="space-y-8">
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
                  <strong>{w.ingredientName}</strong>: need {formatQuantity(w.required)} {w.unit}, have{' '}
                  {formatQuantity(w.available)} {w.unit} (short {formatQuantity(w.shortfall)})
                </li>
              ))}
            </ul>
          </div>
        </div>
      )}

      <div className="space-y-0">
        <h2 className="text-xl font-semibold">Basic Information</h2>

        <fieldset className="fieldset">
          <legend className="fieldset-legend">Description</legend>
          <input
            type="text"
            value={description}
            onChange={(e) => {
              setDescription(e.target.value);
              markUnsaved();
            }}
            className="input input-bordered w-full"
            placeholder="e.g., Morning bread production, Weekend pastries"
          />
        </fieldset>

        <fieldset className="fieldset">
          <legend className="fieldset-legend">Scheduled For</legend>
          <input
            type="datetime-local"
            value={scheduledFor}
            onChange={(e) => {
              setScheduledFor(e.target.value);
              markUnsaved();
            }}
            className="input input-bordered w-full"
          />
          <label className="label">
            <span className="label-text-alt">
              When this production is planned to start
            </span>
          </label>
        </fieldset>

        <fieldset className="fieldset">
          <legend className="fieldset-legend">Notes</legend>
          <textarea
            value={notes}
            onChange={(e) => {
              setNotes(e.target.value);
              markUnsaved();
            }}
            className="textarea textarea-bordered w-full h-24"
            placeholder="Add any notes about this production sheet..."
          />
        </fieldset>
      </div>

      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-semibold">Recipes</h2>
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
                  <RecipeAutocomplete
                    recipes={recipes}
                    selectedRecipeId={entry.recipeId}
                    excludeRecipeIds={recipeEntries
                      .filter((_, i) => i !== index)
                      .map((r) => r.recipeId)
                      .filter(Boolean)}
                    onSelect={(recipe) => updateRecipeEntry(index, 'recipeId', recipe.id)}
                    onClear={() => updateRecipeEntry(index, 'recipeId', '')}
                    placeholder="Search recipes..."
                  />

                  {/* Scale input */}
                  <div className="form-control w-24">
                    <input
                      type="number"
                      step="0.01"
                      min="0.01"
                      max="100"
                      value={entry.scale || ''}
                      onChange={(e) => {
                        const value = e.target.value === '' ? 0 : parseFloat(e.target.value);
                        updateRecipeEntry(index, 'scale', isNaN(value) ? 0 : value);
                      }}
                      onBlur={(e) => {
                        const value = parseFloat(e.target.value);
                        if (!value || value <= 0) {
                          updateRecipeEntry(index, 'scale', 1);
                        }
                      }}
                      className="input input-bordered input-sm"
                      placeholder="Scale"
                      required
                    />
                  </div>

                  {/* Scaled yield display */}
                  {selectedRecipe && (
                    <div className="text-sm text-base-content/70 w-32 hidden sm:block">
                      = {formatQuantity(scaledYield)} {selectedRecipe.yieldUnit}
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
            <span className="font-semibold">{formatCurrency(totalEstimatedCost)}</span>
          </div>
        )}
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
        </div>
      )}
    </form>
  );
}
