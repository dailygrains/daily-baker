'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { createInventoryTransaction } from '@/app/actions/inventoryTransaction';

type InventoryItem = {
  id: string;
  quantity: number;
  unit: string;
  batchNumber?: string | null;
  location?: string | null;
  ingredient: {
    id: string;
    name: string;
  };
  vendor?: {
    id: string;
    name: string;
  } | null;
};

type InventoryTransactionFormProps = {
  bakeryId: string;
  inventoryItems: InventoryItem[];
};

export function InventoryTransactionForm({
  bakeryId,
  inventoryItems,
}: InventoryTransactionFormProps) {
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedItemId, setSelectedItemId] = useState('');

  // Get selected inventory item
  const selectedItem = inventoryItems.find(
    (item) => item.id === selectedItemId
  );

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError(null);
    setIsSubmitting(true);

    const formData = new FormData(e.currentTarget);

    const data = {
      bakeryId,
      type: formData.get('type') as 'RECEIVE' | 'USE' | 'ADJUST' | 'WASTE',
      inventoryItemId: formData.get('inventoryItemId') as string,
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

      {/* Inventory Batch Selection */}
      <div className="form-control">
        <label className="label">
          <span className="label-text">Inventory Batch</span>
        </label>
        <select
          name="inventoryItemId"
          className="select select-bordered"
          required
          value={selectedItemId}
          onChange={(e) => setSelectedItemId(e.target.value)}
        >
          <option value="">Select an inventory batch</option>
          {inventoryItems.map((item) => {
            const batchInfo = item.batchNumber ? ` (Batch: ${item.batchNumber})` : '';
            const vendorInfo = item.vendor ? ` - ${item.vendor.name}` : '';
            const locationInfo = item.location ? ` @ ${item.location}` : '';

            return (
              <option key={item.id} value={item.id}>
                {item.ingredient.name}{vendorInfo}{batchInfo} - Current: {Number(item.quantity).toFixed(3)} {item.unit}{locationInfo}
              </option>
            );
          })}
        </select>
        <label className="label">
          <span className="label-text-alt text-base-content/70">
            Select the inventory batch for this transaction
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
            {selectedItem
              ? `Current quantity: ${Number(selectedItem.quantity).toFixed(3)} ${selectedItem.unit}`
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
          value={selectedItem?.unit || ''}
          readOnly={!!selectedItem}
          required
        />
        <label className="label">
          <span className="label-text-alt text-base-content/70">
            {selectedItem
              ? 'Unit is automatically set from the inventory batch'
              : 'Select an inventory batch to set the unit'}
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
