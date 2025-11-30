'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { assignUserRole } from '@/app/actions/user';
import { assignUserToBakery, unassignUserFromBakery } from '@/app/actions/bakery';
import { useToast } from '@/contexts/ToastContext';
import type { User, Bakery, Role } from '@/generated/prisma';
import { BakeryAutocomplete } from '@/components/bakery/BakeryAutocomplete';
import { X } from 'lucide-react';

interface UserAssignmentFormProps {
  user: User & {
    bakeries: {
      bakery: Bakery;
    }[];
    role: Role | null;
  };
  bakeries: Bakery[];
  roles: Role[];
  onFormRefChange?: (ref: HTMLFormElement | null) => void;
  onSavingChange?: (isSaving: boolean) => void;
  onUnsavedChangesChange?: (hasChanges: boolean) => void;
  showBottomActions?: boolean;
}

export function UserAssignmentForm({
  user,
  bakeries,
  roles,
  onFormRefChange,
  onSavingChange,
  onUnsavedChangesChange,
  showBottomActions = true,
}: UserAssignmentFormProps) {
  const router = useRouter();
  const { showToast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const formRef = useRef<HTMLFormElement>(null);
  const [formData, setFormData] = useState({
    roleId: user.roleId || '',
  });
  const [assignedBakeries, setAssignedBakeries] = useState<Bakery[]>(
    user.bakeries.map(ub => ub.bakery)
  );
  const [hasChanges, setHasChanges] = useState(false);

  // Notify parent of form ref changes
  useEffect(() => {
    onFormRefChange?.(formRef.current);
  }, [onFormRefChange]);

  // Notify parent of saving state changes
  useEffect(() => {
    onSavingChange?.(isSubmitting);
  }, [isSubmitting, onSavingChange]);

  // Track unsaved changes
  useEffect(() => {
    const roleChanged = formData.roleId !== (user.roleId || '');
    onUnsavedChangesChange?.(hasChanges || roleChanged);
  }, [hasChanges, formData.roleId, user.roleId, onUnsavedChangesChange]);

  function handleFieldChange(field: keyof typeof formData, value: string) {
    setFormData((prev) => ({ ...prev, [field]: value }));
  }

  // Handle bakery assignment
  const handleAssignBakery = async (bakeryId: string | null) => {
    if (!bakeryId) return;

    setIsSubmitting(true);

    const result = await assignUserToBakery(user.id, bakeryId);

    if (result.success) {
      const bakery = bakeries.find(b => b.id === bakeryId);
      if (bakery) {
        setAssignedBakeries(prev => [...prev, bakery]);
        setHasChanges(false);
      }
      showToast('Bakery assigned successfully', 'success');
      router.refresh();
    } else {
      showToast(result.error || 'Failed to assign bakery', 'error');
    }

    setIsSubmitting(false);
  };

  // Handle bakery removal
  const handleRemoveBakery = async (bakeryId: string) => {
    setIsSubmitting(true);

    const result = await unassignUserFromBakery(user.id, bakeryId);

    if (result.success) {
      setAssignedBakeries(prev => prev.filter(b => b.id !== bakeryId));
      setHasChanges(false);
      showToast('Bakery unassigned successfully', 'success');
      router.refresh();
    } else {
      showToast(result.error || 'Failed to unassign bakery', 'error');
    }

    setIsSubmitting(false);
  };

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setIsSubmitting(true);

    const result = await assignUserRole(user.id, formData.roleId || null);

    if (result.success) {
      showToast('User updated successfully', 'success');
      router.push('/admin/users');
      router.refresh();
    } else {
      showToast(result.error || 'Failed to update user', 'error');
      setIsSubmitting(false);
    }
  }

  return (
    <form ref={formRef} onSubmit={handleSubmit} className="max-w-3xl mx-auto space-y-8">
      <div className="space-y-0">
        <h2 className="text-xl font-semibold">User Information</h2>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6">
          <fieldset className="fieldset">
            <legend className="fieldset-legend">Name</legend>
            <div className="text-base">{user.name || 'Not set'}</div>
          </fieldset>

          <fieldset className="fieldset">
            <legend className="fieldset-legend">Email</legend>
            <div className="text-base">{user.email}</div>
          </fieldset>

          <fieldset className="fieldset">
            <legend className="fieldset-legend">Joined</legend>
            <div className="text-base">{new Date(user.createdAt).toLocaleDateString()}</div>
          </fieldset>

          <fieldset className="fieldset">
            <legend className="fieldset-legend">Clerk ID</legend>
            <div className="text-sm font-mono text-base-content/60">{user.clerkId}</div>
          </fieldset>
        </div>
      </div>

      <div className="space-y-0">
        <h2 className="text-xl font-semibold">Assigned Bakeries</h2>

        {/* Bakery Autocomplete */}
        <BakeryAutocomplete
          onSelect={handleAssignBakery}
          onError={(message) => showToast(message, 'error')}
          disabled={isSubmitting}
          placeholder="Search bakeries by name..."
          excludeBakeryIds={assignedBakeries.map(b => b.id)}
        />

        {/* Assigned Bakeries Display */}
        {assignedBakeries.length > 0 ? (
          <div className="space-y-2">
            <div className="label">
              <span className="label-text-alt">Currently Assigned ({assignedBakeries.length})</span>
            </div>
            <div className="space-y-2">
              {assignedBakeries.map((bakery) => (
                <div key={bakery.id} className="flex items-center justify-between gap-3 bg-base-200 rounded-lg p-3">
                  <div className="flex-1 min-w-0">
                    <div className="font-medium text-base-content truncate">
                      {bakery.name}
                    </div>
                    {bakery.description && (
                      <div className="text-sm text-base-content/60 truncate">
                        {bakery.description}
                      </div>
                    )}
                  </div>
                  <button
                    type="button"
                    onClick={() => handleRemoveBakery(bakery.id)}
                    className="btn btn-ghost btn-sm btn-circle flex-shrink-0"
                    aria-label="Remove bakery"
                    title="Remove bakery from user"
                    disabled={isSubmitting}
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              ))}
            </div>
          </div>
        ) : (
          <div className="text-center p-6 bg-base-200 rounded-lg">
            <p className="text-base-content/60">
              No bakeries assigned to this user yet.
            </p>
            <p className="text-sm text-base-content/50 mt-1">
              Use the search field above to find and assign bakeries.
            </p>
          </div>
        )}
      </div>

      <div className="space-y-0">
        <h2 className="text-xl font-semibold">Assigned Role</h2>

        <fieldset className="fieldset">
          <legend className="fieldset-legend">Role</legend>
          <select
            name="roleId"
            value={formData.roleId}
            onChange={(e) => handleFieldChange('roleId', e.target.value)}
            className="select select-bordered w-full"
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
        </fieldset>
      </div>

      {showBottomActions && (
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
      )}
    </form>
  );
}
