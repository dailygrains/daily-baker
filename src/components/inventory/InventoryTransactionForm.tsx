'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { createInventoryTransaction } from '@/app/actions/inventoryTransaction';

type Ingredient = {
  id: string;
  name: string;
  unit: string;
  currentQty: number;
};

type InventoryTransactionFormProps = {
  bakeryId: string;
  ingredients: Ingredient[];
};

export function InventoryTransactionForm({
  bakeryId,
  ingredients,
}: InventoryTransactionFormProps) {
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedIngredientId, setSelectedIngredientId] = useState('');

  // Get selected ingredient
  const selectedIngredient = ingredients.find(
    (ing) => ing.id === selectedIngredientId
  );

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError(null);
    setIsSubmitting(true);

    const formData = new FormData(e.currentTarget);

    const data = {
      bakeryId,
      type: formData.get('type') as 'RECEIVE' | 'USE' | 'ADJUST' | 'WASTE',
      ingredientId: formData.get('ingredientId') as string,
      quantity: parseFloat(formData.get('quantity') as string),
      unit: formData.get('unit') as string,
      notes: (formData.get('notes') as string) || null,
    };

    const result = await createInventoryTransaction(data);

    if (result.success) {
      router.push('/dashboard/inventory');
      router.refresh();
    } else {
      setError(result.error || 'Failed to create transaction');
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

      {/* Transaction Type */}
      <div className="form-control">
        <label className="label">
          <span className="label-text">Transaction Type</span>
        </label>
        <select
          name="type"
          className="select select-bordered"
          required
        >
          <option value="">Select transaction type</option>
          <option value="RECEIVE">Receive (Add to inventory)</option>
          <option value="USE">Use (Remove from inventory)</option>
          <option value="ADJUST">Adjust (Manual adjustment)</option>
          <option value="WASTE">Waste (Remove as waste)</option>
        </select>
        <label className="label">
          <span className="label-text-alt text-base-content/70">
            Choose the type of inventory transaction
          </span>
        </label>
      </div>

      {/* Ingredient Selection */}
      <div className="form-control">
        <label className="label">
          <span className="label-text">Ingredient</span>
        </label>
        <select
          name="ingredientId"
          className="select select-bordered"
          required
          value={selectedIngredientId}
          onChange={(e) => setSelectedIngredientId(e.target.value)}
        >
          <option value="">Select an ingredient</option>
          {ingredients.map((ingredient) => (
            <option key={ingredient.id} value={ingredient.id}>
              {ingredient.name} (Current: {ingredient.currentQty.toFixed(3)}{' '}
              {ingredient.unit})
            </option>
          ))}
        </select>
        <label className="label">
          <span className="label-text-alt text-base-content/70">
            Select the ingredient for this transaction
          </span>
        </label>
      </div>

      {/* Quantity */}
      <div className="form-control">
        <label className="label">
          <span className="label-text">Quantity</span>
        </label>
        <input
          type="number"
          name="quantity"
          step="0.001"
          min="0.001"
          className="input input-bordered"
          placeholder="Enter quantity"
          required
        />
        <label className="label">
          <span className="label-text-alt text-base-content/70">
            {selectedIngredient
              ? `Current quantity: ${selectedIngredient.currentQty.toFixed(3)} ${selectedIngredient.unit}`
              : 'Enter the transaction quantity'}
          </span>
        </label>
      </div>

      {/* Unit */}
      <div className="form-control">
        <label className="label">
          <span className="label-text">Unit</span>
        </label>
        <input
          type="text"
          name="unit"
          className="input input-bordered"
          placeholder="e.g., kg, lbs, oz"
          value={selectedIngredient?.unit || ''}
          readOnly={!!selectedIngredient}
          required
        />
        <label className="label">
          <span className="label-text-alt text-base-content/70">
            {selectedIngredient
              ? 'Unit is automatically set from the ingredient'
              : 'Select an ingredient to set the unit'}
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
          placeholder="Add any notes about this transaction..."
        />
        <label className="label">
          <span className="label-text-alt text-base-content/70">
            Optional notes about this transaction
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
            'Create Transaction'
          )}
        </button>
      </div>
    </form>
  );
}
