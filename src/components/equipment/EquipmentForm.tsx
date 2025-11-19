'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { createEquipment, updateEquipment } from '@/app/actions/equipment';
import type { Equipment, Vendor } from '@prisma/client';

interface EquipmentFormProps {
  bakeryId: string;
  equipment?: Equipment & { vendor: Vendor | null };
  vendors?: Array<{ id: string; name: string }>;
}

export function EquipmentForm({ bakeryId, equipment, vendors = [] }: EquipmentFormProps) {
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [formData, setFormData] = useState({
    name: equipment?.name ?? '',
    status: equipment?.status ?? 'CONSIDERING',
    vendorId: equipment?.vendorId ?? '',
    purchaseDate: equipment?.purchaseDate
      ? new Date(equipment.purchaseDate).toISOString().split('T')[0]
      : '',
    cost: equipment?.cost ? Number(equipment.cost) : 0,
    quantity: equipment?.quantity ?? 1,
    serialNumber: equipment?.serialNumber ?? '',
    notes: equipment?.notes ?? '',
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError(null);

    try {
      const result = equipment
        ? await updateEquipment({
            id: equipment.id,
            ...formData,
            vendorId: formData.vendorId || null,
            purchaseDate: formData.purchaseDate ? new Date(formData.purchaseDate) : null,
            cost: formData.cost || null,
            serialNumber: formData.serialNumber || null,
            notes: formData.notes || null,
          })
        : await createEquipment({
            bakeryId,
            ...formData,
            vendorId: formData.vendorId || null,
            purchaseDate: formData.purchaseDate ? new Date(formData.purchaseDate) : null,
            cost: formData.cost || null,
            serialNumber: formData.serialNumber || null,
            notes: formData.notes || null,
          });

      if (result.success) {
        router.push('/dashboard/equipment');
        router.refresh();
      } else {
        setError(result.error || 'Failed to save equipment');
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
          <span className="label-text">Equipment Name *</span>
        </label>
        <input
          type="text"
          className="input input-bordered"
          value={formData.name}
          onChange={(e) => setFormData({ ...formData, name: e.target.value })}
          required
          maxLength={200}
          placeholder="e.g., Commercial Oven"
        />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="form-control">
          <label className="label">
            <span className="label-text">Status *</span>
          </label>
          <select
            className="select select-bordered"
            value={formData.status}
            onChange={(e) => setFormData({ ...formData, status: e.target.value })}
            required
          >
            <option value="CONSIDERING">Considering</option>
            <option value="ORDERED">Ordered</option>
            <option value="RECEIVED">Received</option>
            <option value="IN_USE">In Use</option>
            <option value="MAINTENANCE">Maintenance</option>
            <option value="RETIRED">Retired</option>
          </select>
          <label className="label">
            <span className="label-text-alt">Current status of the equipment</span>
          </label>
        </div>

        <div className="form-control">
          <label className="label">
            <span className="label-text">Quantity *</span>
          </label>
          <input
            type="number"
            min="1"
            className="input input-bordered"
            value={formData.quantity}
            onChange={(e) =>
              setFormData({ ...formData, quantity: parseInt(e.target.value) || 1 })
            }
            required
          />
        </div>
      </div>

      <div className="form-control">
        <label className="label">
          <span className="label-text">Vendor</span>
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
          <span className="label-text-alt">Link to a vendor for easier tracking</span>
        </label>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="form-control">
          <label className="label">
            <span className="label-text">Purchase Date</span>
          </label>
          <input
            type="date"
            className="input input-bordered"
            value={formData.purchaseDate}
            onChange={(e) => setFormData({ ...formData, purchaseDate: e.target.value })}
          />
        </div>

        <div className="form-control">
          <label className="label">
            <span className="label-text">Cost</span>
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
              value={formData.cost}
              onChange={(e) =>
                setFormData({ ...formData, cost: parseFloat(e.target.value) || 0 })
              }
              placeholder="0.00"
            />
          </div>
        </div>
      </div>

      <div className="form-control">
        <label className="label">
          <span className="label-text">Serial Number</span>
        </label>
        <input
          type="text"
          className="input input-bordered"
          value={formData.serialNumber}
          onChange={(e) => setFormData({ ...formData, serialNumber: e.target.value })}
          maxLength={100}
          placeholder="Serial or model number"
        />
      </div>

      <div className="form-control">
        <label className="label">
          <span className="label-text">Notes</span>
        </label>
        <textarea
          className="textarea textarea-bordered h-32"
          value={formData.notes}
          onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
          maxLength={2000}
          placeholder="Additional notes about this equipment..."
        />
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
          ) : equipment ? (
            'Update Equipment'
          ) : (
            'Create Equipment'
          )}
        </button>
      </div>
    </form>
  );
}
