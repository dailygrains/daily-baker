'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { createVendor, updateVendor } from '@/app/actions/vendor';
import type { Vendor } from '@prisma/client';

interface VendorFormProps {
  bakeryId: string;
  vendor?: Vendor;
}

export function VendorForm({ bakeryId, vendor }: VendorFormProps) {
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [formData, setFormData] = useState({
    name: vendor?.name ?? '',
    contactName: vendor?.contactName ?? '',
    email: vendor?.email ?? '',
    phone: vendor?.phone ?? '',
    website: vendor?.website ?? '',
    address: vendor?.address ?? '',
    notes: vendor?.notes ?? '',
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError(null);

    try {
      const result = vendor
        ? await updateVendor({
            id: vendor.id,
            ...formData,
            contactName: formData.contactName || null,
            email: formData.email || null,
            phone: formData.phone || null,
            website: formData.website || null,
            address: formData.address || null,
            notes: formData.notes || null,
          })
        : await createVendor({
            bakeryId,
            ...formData,
            contactName: formData.contactName || null,
            email: formData.email || null,
            phone: formData.phone || null,
            website: formData.website || null,
            address: formData.address || null,
            notes: formData.notes || null,
          });

      if (result.success) {
        router.push('/dashboard/vendors');
        router.refresh();
      } else {
        setError(result.error || 'Failed to save vendor');
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
          <span className="label-text">Vendor Name *</span>
        </label>
        <input
          type="text"
          className="input input-bordered"
          value={formData.name}
          onChange={(e) => setFormData({ ...formData, name: e.target.value })}
          required
          maxLength={100}
          placeholder="e.g., ABC Flour Company"
        />
      </div>

      <div className="divider">Contact Information</div>

      <div className="form-control">
        <label className="label">
          <span className="label-text">Contact Person</span>
        </label>
        <input
          type="text"
          className="input input-bordered"
          value={formData.contactName}
          onChange={(e) => setFormData({ ...formData, contactName: e.target.value })}
          maxLength={100}
          placeholder="e.g., John Smith"
        />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="form-control">
          <label className="label">
            <span className="label-text">Email</span>
          </label>
          <input
            type="email"
            className="input input-bordered"
            value={formData.email}
            onChange={(e) => setFormData({ ...formData, email: e.target.value })}
            maxLength={100}
            placeholder="contact@vendor.com"
          />
        </div>

        <div className="form-control">
          <label className="label">
            <span className="label-text">Phone</span>
          </label>
          <input
            type="tel"
            className="input input-bordered"
            value={formData.phone}
            onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
            maxLength={20}
            placeholder="(555) 123-4567"
          />
        </div>
      </div>

      <div className="form-control">
        <label className="label">
          <span className="label-text">Website</span>
        </label>
        <input
          type="url"
          className="input input-bordered"
          value={formData.website}
          onChange={(e) => setFormData({ ...formData, website: e.target.value })}
          maxLength={255}
          placeholder="https://www.vendor.com"
        />
      </div>

      <div className="form-control">
        <label className="label">
          <span className="label-text">Address</span>
        </label>
        <textarea
          className="textarea textarea-bordered h-24"
          value={formData.address}
          onChange={(e) => setFormData({ ...formData, address: e.target.value })}
          maxLength={500}
          placeholder="Street address, city, state, postal code"
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
          maxLength={1000}
          placeholder="Additional notes about this vendor..."
        />
        <label className="label">
          <span className="label-text-alt">
            Optional notes for internal reference
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
          ) : vendor ? (
            'Update Vendor'
          ) : (
            'Create Vendor'
          )}
        </button>
      </div>
    </form>
  );
}
