'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { createBakery, updateBakery } from '@/app/actions/bakery';
import type { Bakery } from '@prisma/client';

interface BakeryFormProps {
  bakery?: Bakery;
  mode: 'create' | 'edit';
}

export function BakeryForm({ bakery, mode }: BakeryFormProps) {
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setIsSubmitting(true);
    setError(null);

    const formData = new FormData(e.currentTarget);
    const data = {
      ...(mode === 'edit' && bakery ? { id: bakery.id } : {}),
      name: formData.get('name') as string,
      description: formData.get('description') as string,
      address: formData.get('address') as string,
      phone: formData.get('phone') as string,
      email: formData.get('email') as string,
      website: formData.get('website') as string,
    };

    const result = mode === 'create'
      ? await createBakery(data)
      : await updateBakery(data);

    if (result.success) {
      router.push('/admin/bakeries');
      router.refresh();
    } else {
      setError(result.error || 'An error occurred');
      setIsSubmitting(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {error && (
        <div className="alert alert-error">
          <svg xmlns="http://www.w3.org/2000/svg" className="stroke-current shrink-0 h-6 w-6" fill="none" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <span>{error}</span>
        </div>
      )}

      <div className="card bg-base-100 shadow-sm">
        <div className="card-body">
          <h2 className="card-title mb-4">Basic Information</h2>

          <div className="form-control">
            <label className="label">
              <span className="label-text">Bakery Name <span className="text-error">*</span></span>
            </label>
            <input
              type="text"
              name="name"
              defaultValue={bakery?.name}
              className="input input-bordered"
              required
              maxLength={100}
            />
          </div>

          <div className="form-control">
            <label className="label">
              <span className="label-text">Description</span>
            </label>
            <textarea
              name="description"
              defaultValue={bakery?.description || ''}
              className="textarea textarea-bordered h-24"
              placeholder="Brief description of the bakery"
            />
          </div>
        </div>
      </div>

      <div className="card bg-base-100 shadow-sm">
        <div className="card-body">
          <h2 className="card-title mb-4">Contact Information</h2>

          <div className="form-control">
            <label className="label">
              <span className="label-text">Address</span>
            </label>
            <input
              type="text"
              name="address"
              defaultValue={bakery?.address || ''}
              className="input input-bordered"
              placeholder="123 Main St, City, State, ZIP"
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="form-control">
              <label className="label">
                <span className="label-text">Phone</span>
              </label>
              <input
                type="tel"
                name="phone"
                defaultValue={bakery?.phone || ''}
                className="input input-bordered"
                placeholder="(555) 123-4567"
              />
            </div>

            <div className="form-control">
              <label className="label">
                <span className="label-text">Email</span>
              </label>
              <input
                type="email"
                name="email"
                defaultValue={bakery?.email || ''}
                className="input input-bordered"
                placeholder="contact@bakery.com"
              />
            </div>
          </div>

          <div className="form-control">
            <label className="label">
              <span className="label-text">Website</span>
            </label>
            <input
              type="url"
              name="website"
              defaultValue={bakery?.website || ''}
              className="input input-bordered"
              placeholder="https://www.bakery.com"
            />
          </div>
        </div>
      </div>

      <div className="flex gap-4 justify-end">
        <button
          type="button"
          onClick={() => router.back()}
          className="btn btn-ghost"
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
              <span className="loading loading-spinner"></span>
              {mode === 'create' ? 'Creating...' : 'Saving...'}
            </>
          ) : (
            mode === 'create' ? 'Create Bakery' : 'Save Changes'
          )}
        </button>
      </div>
    </form>
  );
}
