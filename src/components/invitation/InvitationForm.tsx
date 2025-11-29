'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { createInvitation } from '@/app/actions/invitation';
import type { Bakery, Role } from '@/generated/prisma';

interface InvitationFormProps {
  bakeries: Bakery[];
  roles: Role[];
}

export function InvitationForm({ bakeries, roles }: InvitationFormProps) {
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setIsSubmitting(true);
    setError(null);

    const formData = new FormData(e.currentTarget);
    const email = formData.get('email') as string;
    const bakeryId = formData.get('bakeryId') as string;
    const roleId = formData.get('roleId') as string;

    const result = await createInvitation({
      email,
      bakeryId: bakeryId || null,
      roleId: roleId || null,
    });

    if (result.success) {
      router.push('/admin/invitations');
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
          <h2 className="card-title mb-4">Invitation Details</h2>

          <div className="form-control">
            <label className="label">
              <span className="label-text">Email Address <span className="text-error">*</span></span>
            </label>
            <input
              type="email"
              name="email"
              className="input input-bordered"
              required
              placeholder="user@example.com"
            />
            <label className="label">
              <span className="label-text-alt">The user will receive an invitation at this email</span>
            </label>
          </div>

          <div className="form-control">
            <label className="label">
              <span className="label-text">Assign to Bakery (Optional)</span>
            </label>
            <select
              name="bakeryId"
              className="select select-bordered"
            >
              <option value="">No bakery (assign later)</option>
              {bakeries.map((bakery) => (
                <option key={bakery.id} value={bakery.id}>
                  {bakery.name}
                </option>
              ))}
            </select>
            <label className="label">
              <span className="label-text-alt">Optionally pre-assign the user to a bakery</span>
            </label>
          </div>

          <div className="form-control">
            <label className="label">
              <span className="label-text">Assign Role (Optional)</span>
            </label>
            <select
              name="roleId"
              className="select select-bordered"
            >
              <option value="">No role (assign later)</option>
              {roles.map((role) => (
                <option key={role.id} value={role.id}>
                  {role.name}
                </option>
              ))}
            </select>
            <label className="label">
              <span className="label-text-alt">Optionally pre-assign a role</span>
            </label>
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
              Creating...
            </>
          ) : (
            'Create Invitation'
          )}
        </button>
      </div>
    </form>
  );
}
