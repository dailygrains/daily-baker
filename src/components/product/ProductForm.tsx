'use client';

import { useState, useRef, useEffect, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { createProduct, updateProduct } from '@/app/actions/product';
import { useFormSubmit } from '@/hooks/useFormSubmit';
import { ProductSupplyLineItems, type BomLine } from '@/components/product/ProductSupplyLineItems';
import { DollarSign } from 'lucide-react';

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

interface ProductFormProps {
  bakeryId: string;
  product?: {
    id: string;
    name: string;
    sku: string | null;
    description: string | null;
    recipeId: string;
    recipeScale: number;
    batchYieldQty: number;
    laborCost: number;
    overheadCost: number;
    retailPrice: number | null;
    wholesalePrice: number | null;
    targetMarginPct: number | null;
    productSupplies: Array<{
      supply: { id: string; name: string; unit: string; costPerUnit: number; category: string };
      quantity: number;
      unit: string;
      wasteFactor: number;
      costOverride: number | null;
      notes: string | null;
    }>;
  };
  recipes: RecipeOption[];
  supplies: SupplyOption[];
  onFormRefChange?: (ref: HTMLFormElement | null) => void;
  onSavingChange?: (isSaving: boolean) => void;
  onUnsavedChangesChange?: (hasChanges: boolean) => void;
  showBottomActions?: boolean;
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
    sku: product?.sku ?? '',
    description: product?.description ?? '',
    recipeId: product?.recipeId ?? '',
    recipeScale: product?.recipeScale ?? 1,
    batchYieldQty: product?.batchYieldQty ?? 1,
    laborCost: product?.laborCost ?? 0,
    overheadCost: product?.overheadCost ?? 0,
    retailPrice: product?.retailPrice ?? '',
    wholesalePrice: product?.wholesalePrice ?? '',
    targetMarginPct: product?.targetMarginPct ?? '',
  });

  const [productSupplies, setProductSupplies] = useState<BomLine[]>(
    product?.productSupplies.map((ps) => ({
      supplyId: ps.supply.id,
      quantity: ps.quantity,
      unit: ps.unit,
      wasteFactor: ps.wasteFactor,
      costOverride: ps.costOverride,
      notes: ps.notes ?? '',
    })) ?? []
  );

  // Notify parent of form ref changes
  useEffect(() => {
    if (onFormRefChange && formRef.current) {
      onFormRefChange(formRef.current);
    }
  }, [onFormRefChange]);

  // Notify parent of saving state changes
  useEffect(() => {
    if (onSavingChange) onSavingChange(isSubmitting);
  }, [isSubmitting, onSavingChange]);

  // Notify parent of unsaved changes state
  useEffect(() => {
    if (onUnsavedChangesChange) onUnsavedChangesChange(hasUnsavedChanges);
  }, [hasUnsavedChanges, onUnsavedChangesChange]);

  // Computed costs
  const selectedRecipe = useMemo(
    () => recipes.find((r) => r.id === formData.recipeId),
    [recipes, formData.recipeId]
  );

  const ingredientCost = useMemo(() => {
    if (!selectedRecipe || formData.batchYieldQty <= 0) return 0;
    return (selectedRecipe.totalCost * formData.recipeScale) / formData.batchYieldQty;
  }, [selectedRecipe, formData.recipeScale, formData.batchYieldQty]);

  const supplyCostTotal = useMemo(() => {
    return productSupplies.reduce((sum, line) => {
      if (!line.supplyId) return sum;
      const supply = supplies.find((s) => s.id === line.supplyId);
      const unitCost = line.costOverride ?? supply?.costPerUnit ?? 0;
      return sum + unitCost * line.quantity * line.wasteFactor;
    }, 0);
  }, [productSupplies, supplies]);

  const totalCost = ingredientCost + supplyCostTotal + formData.laborCost + formData.overheadCost;

  const computedMargin = useMemo(() => {
    const retail = typeof formData.retailPrice === 'number' ? formData.retailPrice : parseFloat(formData.retailPrice as string);
    if (!retail || retail <= 0) return null;
    return ((retail - totalCost) / retail) * 100;
  }, [formData.retailPrice, totalCost]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const payload = {
      name: formData.name,
      sku: formData.sku || null,
      description: formData.description || null,
      recipeId: formData.recipeId,
      recipeScale: formData.recipeScale,
      batchYieldQty: formData.batchYieldQty,
      laborCost: formData.laborCost,
      overheadCost: formData.overheadCost,
      retailPrice: formData.retailPrice !== '' ? Number(formData.retailPrice) : null,
      wholesalePrice: formData.wholesalePrice !== '' ? Number(formData.wholesalePrice) : null,
      targetMarginPct: formData.targetMarginPct !== '' ? Number(formData.targetMarginPct) : null,
      productSupplies: productSupplies
        .filter((ps) => ps.supplyId)
        .map((ps) => ({
          supplyId: ps.supplyId,
          quantity: ps.quantity,
          unit: ps.unit,
          wasteFactor: ps.wasteFactor,
          costOverride: ps.costOverride,
          notes: ps.notes || null,
        })),
    };

    await submit(
      () =>
        product
          ? updateProduct({ id: product.id, ...payload })
          : createProduct({ bakeryId, ...payload }),
      formData.name
    );
  };

  const updateField = (field: string, value: string | number) => {
    setFormData({ ...formData, [field]: value });
    setHasUnsavedChanges(true);
  };

  const handleSuppliesChange = (lines: BomLine[]) => {
    setProductSupplies(lines);
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
          <legend className="fieldset-legend">SKU</legend>
          <input
            type="text"
            className="input input-bordered w-full"
            value={formData.sku}
            onChange={(e) => updateField('sku', e.target.value)}
            maxLength={100}
            placeholder="Internal or retail SKU"
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
      </div>

      {/* Recipe & Yield */}
      <div className="space-y-0">
        <h2 className="text-xl font-semibold">Recipe & Yield</h2>

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

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6">
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

          <fieldset className="fieldset">
            <legend className="fieldset-legend">Batch Yield Qty *</legend>
            <input
              type="number"
              min="1"
              step="1"
              className="input input-bordered w-full"
              value={formData.batchYieldQty}
              onChange={(e) => updateField('batchYieldQty', parseInt(e.target.value) || 1)}
              required
            />
            <label className="label">
              <span className="label-text-alt">How many sellable units per batch</span>
            </label>
          </fieldset>
        </div>

        {selectedRecipe && (
          <div className="text-sm text-base-content/60 mt-2">
            Ingredient cost per unit: <strong>${ingredientCost.toFixed(4)}</strong>
            <span className="ml-2">
              (recipe cost ${selectedRecipe.totalCost.toFixed(2)} x {formData.recipeScale} scale / {formData.batchYieldQty} units)
            </span>
          </div>
        )}
      </div>

      {/* Packaging & Supplies */}
      <div className="space-y-0">
        <h2 className="text-xl font-semibold">Packaging & Supplies</h2>

        <ProductSupplyLineItems
          lines={productSupplies}
          supplies={supplies}
          onChange={handleSuppliesChange}
        />

        {supplyCostTotal > 0 && (
          <div className="text-sm text-base-content/60 mt-2">
            Total supply cost per unit: <strong>${supplyCostTotal.toFixed(4)}</strong>
          </div>
        )}
      </div>

      {/* Additional Costs */}
      <div className="space-y-0">
        <h2 className="text-xl font-semibold">Additional Costs</h2>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6">
          <fieldset className="fieldset">
            <legend className="fieldset-legend">Labor Cost Per Unit</legend>
            <label className="input input-bordered w-full">
              <DollarSign className="h-4 w-4 opacity-50" />
              <input
                type="number"
                step="0.01"
                min="0"
                className="grow"
                value={formData.laborCost}
                onChange={(e) => updateField('laborCost', parseFloat(e.target.value) || 0)}
                placeholder="0.00"
              />
            </label>
          </fieldset>

          <fieldset className="fieldset">
            <legend className="fieldset-legend">Overhead Cost Per Unit</legend>
            <label className="input input-bordered w-full">
              <DollarSign className="h-4 w-4 opacity-50" />
              <input
                type="number"
                step="0.01"
                min="0"
                className="grow"
                value={formData.overheadCost}
                onChange={(e) => updateField('overheadCost', parseFloat(e.target.value) || 0)}
                placeholder="0.00"
              />
            </label>
          </fieldset>
        </div>
      </div>

      {/* Pricing */}
      <div className="space-y-0">
        <h2 className="text-xl font-semibold">Pricing</h2>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6">
          <fieldset className="fieldset">
            <legend className="fieldset-legend">Retail Price</legend>
            <label className="input input-bordered w-full">
              <DollarSign className="h-4 w-4 opacity-50" />
              <input
                type="number"
                step="0.01"
                min="0"
                className="grow"
                value={formData.retailPrice}
                onChange={(e) => updateField('retailPrice', e.target.value === '' ? '' as unknown as number : parseFloat(e.target.value))}
                placeholder="0.00"
              />
            </label>
          </fieldset>

          <fieldset className="fieldset">
            <legend className="fieldset-legend">Wholesale Price</legend>
            <label className="input input-bordered w-full">
              <DollarSign className="h-4 w-4 opacity-50" />
              <input
                type="number"
                step="0.01"
                min="0"
                className="grow"
                value={formData.wholesalePrice}
                onChange={(e) => updateField('wholesalePrice', e.target.value === '' ? '' as unknown as number : parseFloat(e.target.value))}
                placeholder="0.00"
              />
            </label>
          </fieldset>
        </div>

        <fieldset className="fieldset">
          <legend className="fieldset-legend">Target Margin %</legend>
          <input
            type="number"
            step="0.1"
            min="0"
            max="100"
            className="input input-bordered w-full"
            value={formData.targetMarginPct}
            onChange={(e) => updateField('targetMarginPct', e.target.value === '' ? '' as unknown as number : parseFloat(e.target.value))}
            placeholder="e.g., 65"
          />
        </fieldset>

        <div className="card bg-base-200 p-4 mt-2">
          <div className="grid grid-cols-2 gap-2 text-sm">
            <div>Total Cost Per Unit:</div>
            <div className="font-semibold">${totalCost.toFixed(4)}</div>
            {computedMargin !== null && (
              <>
                <div>Computed Margin:</div>
                <div className={`font-semibold ${computedMargin < 0 ? 'text-error' : 'text-success'}`}>
                  {computedMargin.toFixed(1)}%
                </div>
              </>
            )}
          </div>
        </div>
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
