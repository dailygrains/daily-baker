'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { createRole, updateRole } from '@/app/actions/role';
import type { Role, Bakery } from '@prisma/client';

interface RoleFormProps {
  role?: Role;
  bakery: Bakery;
  mode: 'create' | 'edit';
}

const DEFAULT_PERMISSIONS = {
  'recipes.read': false,
  'recipes.write': false,
  'recipes.delete': false,
  'ingredients.read': false,
  'ingredients.write': false,
  'bake-sheets.read': false,
  'bake-sheets.write': false,
  'bake-sheets.complete': false,
  'vendors.read': false,
  'vendors.write': false,
  'team.read': false,
  'team.write': false,
  'settings.read': false,
  'settings.write': false,
};

const PERMISSION_CATEGORIES = {
  'Recipes': ['recipes.read', 'recipes.write', 'recipes.delete'],
  'Ingredients & Inventory': ['ingredients.read', 'ingredients.write'],
  'Bake Sheets': ['bake-sheets.read', 'bake-sheets.write', 'bake-sheets.complete'],
  'Vendors': ['vendors.read', 'vendors.write'],
  'Team Management': ['team.read', 'team.write'],
  'Settings': ['settings.read', 'settings.write'],
};

const PERMISSION_LABELS: Record<string, string> = {
  'recipes.read': 'View recipes',
  'recipes.write': 'Create/edit recipes',
  'recipes.delete': 'Delete recipes',
  'ingredients.read': 'View ingredients',
  'ingredients.write': 'Manage inventory',
  'bake-sheets.read': 'View bake sheets',
  'bake-sheets.write': 'Create/edit bake sheets',
  'bake-sheets.complete': 'Mark bake sheets complete',
  'vendors.read': 'View vendors',
  'vendors.write': 'Manage vendors',
  'team.read': 'View team members',
  'team.write': 'Manage team members',
  'settings.read': 'View settings',
  'settings.write': 'Edit settings',
};

export function RoleForm({ role, bakery, mode }: RoleFormProps) {
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const initialPermissions = role ? (role.permissions as Record<string, boolean>) : DEFAULT_PERMISSIONS;
  const [permissions, setPermissions] = useState<Record<string, boolean>>(initialPermissions);

  function togglePermission(key: string) {
    setPermissions((prev) => ({
      ...prev,
      [key]: !prev[key],
    }));
  }

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setIsSubmitting(true);
    setError(null);

    const formData = new FormData(e.currentTarget);
    const name = formData.get('name') as string;
    const description = formData.get('description') as string;

    const result = mode === 'create'
      ? await createRole({
          bakeryId: bakery.id,
          name,
          description,
          permissions,
        })
      : await updateRole({
          id: role!.id,
          name,
          description,
          permissions,
        });

    if (result.success) {
      router.push(`/admin/bakeries/${bakery.id}/roles`);
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
          <h2 className="card-title mb-4">Role Details</h2>

          <div className="form-control">
            <label className="label">
              <span className="label-text">Role Name <span className="text-error">*</span></span>
            </label>
            <input
              type="text"
              name="name"
              defaultValue={role?.name}
              className="input input-bordered"
              required
              placeholder="Head Baker, Inventory Manager, etc."
            />
          </div>

          <div className="form-control">
            <label className="label">
              <span className="label-text">Description</span>
            </label>
            <textarea
              name="description"
              defaultValue={role?.description || ''}
              className="textarea textarea-bordered h-20"
              placeholder="Brief description of this role's responsibilities"
            />
          </div>
        </div>
      </div>

      <div className="card bg-base-100 shadow-sm">
        <div className="card-body">
          <h2 className="card-title mb-4">Permissions</h2>
          <p className="text-sm text-base-content/60 mb-4">
            Select the permissions this role should have
          </p>

          {Object.entries(PERMISSION_CATEGORIES).map(([category, perms]) => (
            <div key={category} className="mb-6">
              <h3 className="font-bold mb-3">{category}</h3>
              <div className="space-y-2 pl-4">
                {perms.map((perm) => (
                  <label key={perm} className="label cursor-pointer justify-start gap-3">
                    <input
                      type="checkbox"
                      className="checkbox checkbox-primary"
                      checked={permissions[perm] || false}
                      onChange={() => togglePermission(perm)}
                    />
                    <span className="label-text">{PERMISSION_LABELS[perm]}</span>
                  </label>
                ))}
              </div>
            </div>
          ))}
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
            mode === 'create' ? 'Create Role' : 'Save Changes'
          )}
        </button>
      </div>
    </form>
  );
}
