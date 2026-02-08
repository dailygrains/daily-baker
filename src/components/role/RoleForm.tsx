'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { createRole, updateRole } from '@/app/actions/role';
import { useFormSubmit } from '@/hooks/useFormSubmit';
import type { Role, Bakery } from '@/generated/prisma';

interface RoleFormProps {
  role?: Role;
  bakery?: Bakery;
  mode: 'create' | 'edit';
  onFormRefChange?: (ref: HTMLFormElement | null) => void;
  onSavingChange?: (isSaving: boolean) => void;
  onUnsavedChangesChange?: (hasChanges: boolean) => void;
  showBottomActions?: boolean;
}

const DEFAULT_PERMISSIONS = {
  'recipes.read': false,
  'recipes.write': false,
  'recipes.delete': false,
  'ingredients.read': false,
  'ingredients.write': false,
  'production-sheets.read': false,
  'production-sheets.write': false,
  'production-sheets.complete': false,
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
  'Production Sheets': ['production-sheets.read', 'production-sheets.write', 'production-sheets.complete'],
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
  'production-sheets.read': 'View production sheets',
  'production-sheets.write': 'Create/edit production sheets',
  'production-sheets.complete': 'Mark production sheets complete',
  'vendors.read': 'View vendors',
  'vendors.write': 'Manage vendors',
  'team.read': 'View team members',
  'team.write': 'Manage team members',
  'settings.read': 'View settings',
  'settings.write': 'Edit settings',
};

export function RoleForm({
  role,
  bakery,
  mode,
  onFormRefChange,
  onSavingChange,
  onUnsavedChangesChange,
  showBottomActions = true
}: RoleFormProps) {
  const router = useRouter();
  const listPath = bakery ? `/admin/bakeries/${bakery.id}/roles` : '/admin/roles';
  const { submit, isSubmitting, error } = useFormSubmit({
    mode,
    entityName: 'Role',
    listPath,
  });

  const initialPermissions = role ? (role.permissions as Record<string, boolean>) : DEFAULT_PERMISSIONS;
  const [permissions, setPermissions] = useState<Record<string, boolean>>(initialPermissions);
  const formRef = useRef<HTMLFormElement>(null);

  useEffect(() => {
    if (onFormRefChange && formRef.current) {
      onFormRefChange(formRef.current);
    }
  }, [onFormRefChange]);

  useEffect(() => {
    if (onSavingChange) {
      onSavingChange(isSubmitting);
    }
  }, [isSubmitting, onSavingChange]);

  useEffect(() => {
    if (onUnsavedChangesChange && mode === 'edit') {
      const hasChanges = JSON.stringify(permissions) !== JSON.stringify(initialPermissions);
      onUnsavedChangesChange(hasChanges);
    }
  }, [permissions, initialPermissions, onUnsavedChangesChange, mode]);

  function togglePermission(key: string) {
    setPermissions((prev) => ({
      ...prev,
      [key]: !prev[key],
    }));
  }

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();

    const formData = new FormData(e.currentTarget);
    const name = formData.get('name') as string;
    const description = formData.get('description') as string;

    await submit(
      () =>
        mode === 'create'
          ? createRole({
              name,
              description,
              permissions,
            })
          : updateRole({
              id: role!.id,
              name,
              description,
              permissions,
            }),
      name
    );
  }

  return (
    <form ref={formRef} onSubmit={handleSubmit} className="space-y-8">
      {error && (
        <div className="alert alert-error">
          <svg xmlns="http://www.w3.org/2000/svg" className="stroke-current shrink-0 h-6 w-6" fill="none" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <span>{error}</span>
        </div>
      )}

      <div className="space-y-0">
        <h2 className="text-xl font-semibold">Role Details</h2>

        <fieldset className="fieldset">
          <legend className="fieldset-legend">Role Name *</legend>
          <input
            type="text"
            name="name"
            defaultValue={role?.name}
            className="input input-bordered w-full"
            required
            placeholder="Head Baker, Inventory Manager, etc."
            maxLength={100}
          />
        </fieldset>

        <fieldset className="fieldset">
          <legend className="fieldset-legend">Description</legend>
          <textarea
            name="description"
            defaultValue={role?.description || ''}
            className="textarea textarea-bordered h-24 w-full"
            placeholder="Brief description of this role's responsibilities"
            maxLength={500}
          />
        </fieldset>
      </div>

      <div className="space-y-0">
        <h2 className="text-xl font-semibold">Permissions</h2>

        {Object.entries(PERMISSION_CATEGORIES).map(([category, perms]) => (
          <fieldset key={category} className="fieldset">
            <legend className="fieldset-legend">{category}</legend>
            <div className="space-y-3">
              {perms.map((perm) => (
                <label key={perm} className="flex items-center gap-3 cursor-pointer">
                  <input
                    type="checkbox"
                    className="checkbox checkbox-primary"
                    checked={permissions[perm] || false}
                    onChange={() => togglePermission(perm)}
                  />
                  <span className="text-base">{PERMISSION_LABELS[perm]}</span>
                </label>
              ))}
            </div>
          </fieldset>
        ))}
      </div>

      {showBottomActions && (
        <div className="flex gap-3 justify-end pt-4">
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
                <span className="loading loading-spinner loading-sm"></span>
                {mode === 'create' ? 'Creating...' : 'Saving...'}
              </>
            ) : (
              mode === 'create' ? 'Create Role' : 'Save Changes'
            )}
          </button>
        </div>
      )}
    </form>
  );
}
