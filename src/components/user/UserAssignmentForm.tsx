'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { updateUser } from '@/app/actions/user';
import type { User, Bakery, Role } from '@prisma/client';

interface UserAssignmentFormProps {
  user: User & {
    bakery: Bakery | null;
    role: Role | null;
  };
  bakeries: Bakery[];
  roles: Role[];
}

export function UserAssignmentForm({ user, bakeries, roles }: UserAssignmentFormProps) {
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setIsSubmitting(true);
    setError(null);

    const formData = new FormData(e.currentTarget);
    const bakeryId = formData.get('bakeryId') as string;
    const roleId = formData.get('roleId') as string;

    const result = await updateUser({
      id: user.id,
      bakeryId: bakeryId || null,
      roleId: roleId || null,
    });

    if (result.success) {
      router.push('/admin/users');
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
          <h2 className="card-title mb-4">User Information</h2>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <div className="text-sm font-medium text-base-content/60">Name</div>
              <div className="text-lg">{user.name || 'Not set'}</div>
            </div>

            <div>
              <div className="text-sm font-medium text-base-content/60">Email</div>
              <div className="text-lg">{user.email}</div>
            </div>

            <div>
              <div className="text-sm font-medium text-base-content/60">Joined</div>
              <div className="text-lg">{new Date(user.createdAt).toLocaleDateString()}</div>
            </div>

            <div>
              <div className="text-sm font-medium text-base-content/60">Clerk ID</div>
              <div className="text-sm font-mono text-base-content/60">{user.clerkId}</div>
            </div>
          </div>
        </div>
      </div>

      <div className="card bg-base-100 shadow-sm">
        <div className="card-body">
          <h2 className="card-title mb-4">Assignments</h2>

          <div className="form-control">
            <label className="label">
              <span className="label-text">Bakery</span>
            </label>
            <select
              name="bakeryId"
              defaultValue={user.bakeryId || ''}
              className="select select-bordered"
            >
              <option value="">No bakery assigned</option>
              {bakeries.map((bakery) => (
                <option key={bakery.id} value={bakery.id}>
                  {bakery.name}
                </option>
              ))}
            </select>
            <label className="label">
              <span className="label-text-alt">Assign this user to a bakery</span>
            </label>
          </div>

          <div className="form-control">
            <label className="label">
              <span className="label-text">Role</span>
            </label>
            <select
              name="roleId"
              defaultValue={user.roleId || ''}
              className="select select-bordered"
            >
              <option value="">No role assigned</option>
              {roles.map((role) => (
                <option key={role.id} value={role.id}>
                  {role.name}
                </option>
              ))}
            </select>
            <label className="label">
              <span className="label-text-alt">Assign a role to this user</span>
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
              Saving...
            </>
          ) : (
            'Save Changes'
          )}
        </button>
      </div>
    </form>
  );
}
