'use client';

import { useState, useRef, useEffect, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { createProduct, updateProduct, getRecipeBatchBasis } from '@/app/actions/product';
import { useFormSubmit } from '@/hooks/useFormSubmit';
import {
  ProductVariationEditor,
  emptyVariation,
  type VariationDraft,
} from '@/components/product/ProductVariationEditor';

interface RecipeOption {
  id: string;
  name: string;
  totalCost: number;
}

interface SupplyOption {
  id: string;
  name: string;
  unit: string;
  costPerUnit: number;
  category: string;
}

export interface ProductFormProduct {
  id: string;
  name: string;
  description: string | null;
  squareItemId: string | null;
  recipeId: string;
  recipeScale: number;
  isActive: boolean;
  variations: Array<{
    id: string;
    name: string;
    sku: string | null;
    squareVariationId: string | null;
    unitWeightG: number | null;
    batchYieldQty: number | null;
    laborCost: number;
    overheadCost: number;
    retailPrice: number | null;
    wholesalePrice: number | null;
    targetMarginPct: number | null;
    isActive: boolean;
    variationSupplies: Array<{
      supply: { id: string; name: string; unit: string; costPerUnit: number; category: string };
      quantity: number;
      unit: string;
      wasteFactor: number;
      costOverride: number | null;
      notes: string | null;
    }>;
  }>;
}

interface ProductFormProps {
  bakeryId: string;
  product?: ProductFormProduct;
  recipes: RecipeOption[];
  supplies: SupplyOption[];
  onFormRefChange?: (ref: HTMLFormElement | null) => void;
  onSavingChange?: (isSaving: boolean) => void;
  onUnsavedChangesChange?: (hasChanges: boolean) => void;
  showBottomActions?: boolean;
}

function toDrafts(product?: ProductFormProduct): VariationDraft[] {
  if (!product) return [emptyVariation('Regular')];
  return product.variations.map((v) => ({
    id: v.id,
    name: v.name,
    sku: v.sku ?? '',
    squareVariationId: v.squareVariationId ?? '',
    unitWeightG: v.unitWeightG,
    batchYieldQty: v.batchYieldQty,
    laborCost: v.laborCost,
    overheadCost: v.overheadCost,
    retailPrice: v.retailPrice,
    wholesalePrice: v.wholesalePrice,
    targetMarginPct: v.targetMarginPct,
    isActive: v.isActive,
    supplies: v.variationSupplies.map((ps) => ({
      supplyId: ps.supply.id,
      quantity: ps.quantity,
      unit: ps.unit,
      wasteFactor: ps.wasteFactor,
      costOverride: ps.costOverride,
      notes: ps.notes ?? '',
    })),
  }));
}

export function ProductForm({
  bakeryId,
  product,
  recipes,
  supplies,
  onFormRefChange,
  onSavingChange,
  onUnsavedChangesChange,
  showBottomActions = true,
}: ProductFormProps) {
  const router = useRouter();
  const formRef = useRef<HTMLFormElement>(null);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);

  const { submit, isSubmitting, error } = useFormSubmit({
    mode: product ? 'edit' : 'create',
    entityName: 'Product',
    listPath: '/dashboard/products',
    onSuccess: () => setHasUnsavedChanges(false),
  });

  const [formData, setFormData] = useState({
    name: product?.name ?? '',
    description: product?.description ?? '',
    squareItemId: product?.squareItemId ?? '',
    recipeId: product?.recipeId ?? '',
    recipeScale: product?.recipeScale ?? 1,
    isActive: product?.isActive ?? true,
  });

  const [variations, setVariations] = useState<VariationDraft[]>(() => toDrafts(product));

  /**
   * Batch weight comes from the recipe's ingredients, which only the server can
   * resolve (it needs unit conversions and ingredient densities), so it is
   * fetched whenever the recipe or scale changes.
   */
  const [basis, setBasis] = useState<{
    recipeId: string;
    recipeScale: number;
    batchWeightG: number | null;
    warnings: string[];
  } | null>(null);

  useEffect(() => {
    const recipeId = formData.recipeId;
    const recipeScale = formData.recipeScale;
    if (!recipeId) return;
    let cancelled = false;
    getRecipeBatchBasis(recipeId, recipeScale).then((result) => {
      if (cancelled) return;
      setBasis({
        recipeId,
        recipeScale,
        batchWeightG: result.success && result.data ? result.data.batchWeightG : null,
        warnings: result.success && result.data ? result.data.warnings : [],
      });
    });
    return () => {
      cancelled = true;
    };
  }, [formData.recipeId, formData.recipeScale]);

  // Only trust the fetched basis while it still matches the selected recipe and
  // scale, so a stale figure never drives the cost preview mid-fetch.
  const basisIsCurrent =
    basis !== null &&
    basis.recipeId === formData.recipeId &&
    basis.recipeScale === formData.recipeScale;
  const batchWeightG = basisIsCurrent ? basis.batchWeightG : null;
  const weightWarnings = basisIsCurrent ? basis.warnings : [];

  useEffect(() => {
    if (onFormRefChange && formRef.current) {
      onFormRefChange(formRef.current);
    }
  }, [onFormRefChange]);

  useEffect(() => {
    if (onSavingChange) onSavingChange(isSubmitting);
  }, [isSubmitting, onSavingChange]);

  useEffect(() => {
    if (onUnsavedChangesChange) onUnsavedChangesChange(hasUnsavedChanges);
  }, [hasUnsavedChanges, onUnsavedChangesChange]);

  const selectedRecipe = useMemo(
    () => recipes.find((r) => r.id === formData.recipeId),
    [recipes, formData.recipeId]
  );

  const batchCost = (selectedRecipe?.totalCost ?? 0) * formData.recipeScale;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const payloadVariations = variations.map((v, index) => ({
      ...(v.id ? { id: v.id } : {}),
      name: v.name,
      sku: v.sku || null,
      squareVariationId: v.squareVariationId || null,
      unitWeightG: v.unitWeightG,
      batchYieldQty: v.batchYieldQty,
      laborCost: v.laborCost,
      overheadCost: v.overheadCost,
      retailPrice: v.retailPrice,
      wholesalePrice: v.wholesalePrice,
      targetMarginPct: v.targetMarginPct,
      isActive: v.isActive,
      sortOrder: index,
      variationSupplies: v.supplies
        .filter((ps) => ps.supplyId)
        .map((ps) => ({
          supplyId: ps.supplyId,
          quantity: ps.quantity,
          unit: ps.unit,
          wasteFactor: ps.wasteFactor,
          costOverride: ps.costOverride,
          notes: ps.notes || null,
        })),
    }));

    const payload = {
      name: formData.name,
      description: formData.description || null,
      squareItemId: formData.squareItemId || null,
      recipeId: formData.recipeId,
      recipeScale: formData.recipeScale,
      isActive: formData.isActive,
      variations: payloadVariations,
    };

    await submit(
      () =>
        product
          ? updateProduct({ id: product.id, ...payload })
          : createProduct({ bakeryId, ...payload }),
      formData.name
    );
  };

  const updateField = (field: string, value: string | number | boolean) => {
    setFormData({ ...formData, [field]: value });
    setHasUnsavedChanges(true);
  };

  const handleVariationsChange = (next: VariationDraft[]) => {
    setVariations(next);
    setHasUnsavedChanges(true);
  };

  return (
    <form ref={formRef} onSubmit={handleSubmit} className="space-y-8">
      {error && (
        <div className="alert alert-error">
          <span>{error}</span>
        </div>
      )}

      {/* Basic Information */}
      <div className="space-y-0">
        <h2 className="text-xl font-semibold">Basic Information</h2>

        <fieldset className="fieldset">
          <legend className="fieldset-legend">Product Name *</legend>
          <input
            type="text"
            className="input input-bordered w-full"
            value={formData.name}
            onChange={(e) => updateField('name', e.target.value)}
            required
            maxLength={200}
            placeholder="e.g., Sourdough Loaf"
          />
        </fieldset>

        <fieldset className="fieldset">
          <legend className="fieldset-legend">Description</legend>
          <textarea
            className="textarea textarea-bordered w-full h-24"
            value={formData.description}
            onChange={(e) => updateField('description', e.target.value)}
            maxLength={2000}
            placeholder="Product description..."
          />
        </fieldset>

        <fieldset className="fieldset">
          <legend className="fieldset-legend">Square Item ID</legend>
          <input
            type="text"
            className="input input-bordered w-full font-mono text-sm"
            value={formData.squareItemId}
            onChange={(e) => updateField('squareItemId', e.target.value)}
            maxLength={100}
            placeholder="Set by Square sync"
          />
          <label className="label">
            <span className="label-text-alt">
              Links this product to a Square catalog item so syncs stay matched
            </span>
          </label>
        </fieldset>

        <label className="label cursor-pointer justify-start gap-3">
          <input
            type="checkbox"
            className="checkbox"
            checked={formData.isActive}
            onChange={(e) => updateField('isActive', e.target.checked)}
          />
          <span className="label-text">Active</span>
        </label>
      </div>

      {/* Recipe */}
      <div className="space-y-0">
        <h2 className="text-xl font-semibold">Recipe</h2>

        <fieldset className="fieldset">
          <legend className="fieldset-legend">Recipe *</legend>
          <select
            className="select select-bordered w-full"
            value={formData.recipeId}
            onChange={(e) => updateField('recipeId', e.target.value)}
            required
          >
            <option value="">Select a recipe...</option>
            {recipes.map((r) => (
              <option key={r.id} value={r.id}>
                {r.name}
              </option>
            ))}
          </select>
        </fieldset>

        <fieldset className="fieldset">
          <legend className="fieldset-legend">Recipe Scale</legend>
          <input
            type="number"
            step="0.01"
            min="0.01"
            className="input input-bordered w-full"
            value={formData.recipeScale}
            onChange={(e) => updateField('recipeScale', parseFloat(e.target.value) || 1)}
          />
          <label className="label">
            <span className="label-text-alt">Multiplier for recipe batch (1 = single batch)</span>
          </label>
        </fieldset>

        {selectedRecipe && (
          <div className="text-sm text-base-content/60 mt-2">
            Batch ingredient cost: <strong>${batchCost.toFixed(2)}</strong>
            {batchWeightG != null ? (
              <span className="ml-2">
                over <strong>{batchWeightG.toFixed(0)}g</strong> of batch weight
              </span>
            ) : (
              <span className="ml-2">
                (batch weight unavailable, so variations need a batch yield)
              </span>
            )}
          </div>
        )}

        {weightWarnings.length > 0 && (
          <div className="alert alert-warning mt-2">
            <div className="text-sm">
              <div className="font-medium">Some ingredients could not be weighed:</div>
              <ul className="list-disc list-inside">
                {weightWarnings.slice(0, 5).map((w, i) => (
                  <li key={i}>{w}</li>
                ))}
              </ul>
            </div>
          </div>
        )}
      </div>

      {/* Variations */}
      <div className="space-y-0">
        <h2 className="text-xl font-semibold">Variations</h2>
        <p className="text-sm text-base-content/60 mb-3">
          Each variation is a size or option sold in Square. Sizes of the same recipe split the
          batch cost by weight.
        </p>

        <ProductVariationEditor
          variations={variations}
          supplies={supplies}
          batchCost={batchCost}
          batchWeightG={batchWeightG}
          onChange={handleVariationsChange}
        />
      </div>

      {showBottomActions && (
        <div className="flex gap-3 justify-between pt-4">
          <div className="flex gap-3 ml-auto">
            <button type="button" className="btn btn-ghost" onClick={() => router.back()} disabled={isSubmitting}>
              Cancel
            </button>
            <button type="submit" className="btn btn-primary" disabled={isSubmitting}>
              {isSubmitting ? (
                <>
                  <span className="loading loading-spinner loading-sm"></span>
                  {product ? 'Saving...' : 'Creating...'}
                </>
              ) : (
                product ? 'Save Changes' : 'Create Product'
              )}
            </button>
          </div>
        </div>
      )}
    </form>
  );
}
