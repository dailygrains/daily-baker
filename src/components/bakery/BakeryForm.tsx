'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { createBakery, updateBakery, deleteBakery, assignUserToBakery, unassignUserFromBakery } from '@/app/actions/bakery';
import { useToast } from '@/contexts/ToastContext';
import type { Bakery } from '@/generated/prisma';
import { Trash2, X } from 'lucide-react';
import { formatPhoneNumber } from '@/lib/utils/phone';
import { UserAutocomplete } from '@/components/user/UserAutocomplete';

interface BakeryUser {
  id: string;
  name: string | null;
  email: string;
  role: {
    id: string;
    name: string;
  } | null;
}

interface BakeryFormProps {
  bakery?: Bakery & {
    _count?: { users: number };
    users?: BakeryUser[];
  };
  mode: 'create' | 'edit';
  redirectPath?: string;
  onFormRefChange?: (ref: HTMLFormElement | null) => void;
  onSavingChange?: (isSaving: boolean) => void;
  onUnsavedChangesChange?: (hasChanges: boolean) => void;
  showBottomActions?: boolean;
}

export function BakeryForm({
  bakery,
  mode,
  redirectPath = '/admin/bakeries',
  onFormRefChange,
  onSavingChange,
  onUnsavedChangesChange,
  showBottomActions = true,
}: BakeryFormProps) {
  const router = useRouter();
  const { showToast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [phoneValue, setPhoneValue] = useState(bakery?.phone || '');
  const formRef = useRef<HTMLFormElement>(null);

  // User assignment state
  const [assignedUsers, setAssignedUsers] = useState<BakeryUser[]>(bakery?.users || []);
  const [isAssigningUser, setIsAssigningUser] = useState(false);

  // Notify parent of form ref changes
  useEffect(() => {
    if (onFormRefChange && formRef.current) {
      onFormRefChange(formRef.current);
    }
  }, [onFormRefChange]);

  // Notify parent of saving state changes
  useEffect(() => {
    if (onSavingChange) {
      onSavingChange(isSubmitting);
    }
  }, [isSubmitting, onSavingChange]);

  // Notify parent of unsaved changes state
  useEffect(() => {
    if (onUnsavedChangesChange) {
      onUnsavedChangesChange(hasUnsavedChanges);
    }
  }, [hasUnsavedChanges, onUnsavedChangesChange]);

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
      const message = mode === 'create'
        ? `Bakery "${data.name}" created successfully`
        : `Bakery "${data.name}" updated successfully`;

      showToast(message, 'success');

      if (mode === 'create' && result.data) {
        // Redirect to edit page for the newly created bakery
        router.push(`/admin/bakeries/${result.data.id}/edit`);
      }

      router.refresh();
      setIsSubmitting(false);
    } else {
      setError(result.error || 'An error occurred');
      setIsSubmitting(false);
    }
  }

  async function handleDelete() {
    if (!bakery?.id) return;

    setIsDeleting(true);
    setError(null);

    const result = await deleteBakery(bakery.id);

    if (result.success) {
      showToast(`Bakery "${bakery.name}" deleted successfully`, 'success');
      router.push(redirectPath);
      router.refresh();
    } else {
      setError(result.error || 'Failed to delete bakery');
      setIsDeleting(false);
      setShowDeleteModal(false);
    }
  }

  const handlePhoneChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const formatted = formatPhoneNumber(e.target.value);
    setPhoneValue(formatted);
    setHasUnsavedChanges(true);
  };

  const handleInputChange = () => {
    setHasUnsavedChanges(true);
  };

  // Handle user assignment
  const handleAssignUser = async (userId: string | null) => {
    if (!userId || !bakery?.id || mode === 'create') return;

    setIsAssigningUser(true);
    setError(null);

    const result = await assignUserToBakery(userId, bakery.id);

    if (result.success && result.data) {
      const newUser: BakeryUser = {
        id: result.data.id,
        name: result.data.name,
        email: result.data.email,
        role: result.data.role,
      };
      setAssignedUsers(prev => [...prev, newUser]);
      showToast(`User assigned successfully`, 'success');
      router.refresh();
    } else {
      setError(result.error || 'Failed to assign user');
      showToast(result.error || 'Failed to assign user', 'error');
    }

    setIsAssigningUser(false);
  };

  // Handle user removal
  const handleRemoveUser = async (userId: string) => {
    if (!bakery?.id) return;

    setError(null);

    const result = await unassignUserFromBakery(userId, bakery.id);

    if (result.success) {
      setAssignedUsers(prev => prev.filter(u => u.id !== userId));
      showToast(`User unassigned successfully`, 'success');
      router.refresh();
    } else {
      setError(result.error || 'Failed to unassign user');
      showToast(result.error || 'Failed to unassign user', 'error');
    }
  };

  return (
    <form ref={formRef} onSubmit={handleSubmit} onChange={handleInputChange} className="max-w-3xl mx-auto space-y-8">
      {error && (
        <div className="alert alert-error">
          <svg xmlns="http://www.w3.org/2000/svg" className="stroke-current shrink-0 h-6 w-6" fill="none" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <span>{error}</span>
        </div>
      )}

      <div className="space-y-0">
        <h2 className="text-xl font-semibold">Basic Information</h2>

        <fieldset className="fieldset">
          <legend className="fieldset-legend">Bakery Name *</legend>
          <input
            type="text"
            name="name"
            defaultValue={bakery?.name}
            className="input input-bordered w-full"
            required
            maxLength={100}
            placeholder="e.g., Artisan Bread Co."
          />
        </fieldset>

        <fieldset className="fieldset">
          <legend className="fieldset-legend">Description</legend>
          <textarea
            name="description"
            defaultValue={bakery?.description || ''}
            className="textarea textarea-bordered h-24 w-full"
            placeholder="Brief description of the bakery..."
            maxLength={500}
          />
        </fieldset>
      </div>

      <div className="space-y-0">
        <h2 className="text-xl font-semibold">Contact Information</h2>

        <fieldset className="fieldset">
          <legend className="fieldset-legend">Address</legend>
          <input
            type="text"
            name="address"
            defaultValue={bakery?.address || ''}
            className="input input-bordered w-full"
            placeholder="123 Main St, City, State, ZIP"
            maxLength={200}
          />
        </fieldset>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6">
          <fieldset className="fieldset">
            <legend className="fieldset-legend">Phone</legend>
            <input
              type="tel"
              name="phone"
              value={phoneValue}
              onChange={handlePhoneChange}
              className="input input-bordered w-full"
              placeholder="(555) 123-4567"
              maxLength={14}
            />
            <label className="label">
              <span className="label-text-alt">Automatically formats as you type</span>
            </label>
          </fieldset>

          <fieldset className="fieldset">
            <legend className="fieldset-legend">Email</legend>
            <input
              type="email"
              name="email"
              defaultValue={bakery?.email || ''}
              className="input input-bordered w-full"
              placeholder="contact@bakery.com"
              maxLength={100}
            />
          </fieldset>
        </div>

        <fieldset className="fieldset">
          <legend className="fieldset-legend">Website</legend>
          <input
            type="url"
            name="website"
            defaultValue={bakery?.website || ''}
            className="input input-bordered w-full"
            placeholder="https://www.bakery.com"
            maxLength={200}
          />
        </fieldset>
      </div>

      {/* User Assignment Section - Only show in edit mode */}
      {mode === 'edit' && bakery && (
        <div className="space-y-0">
          <h2 className="text-xl font-semibold">Assigned Users</h2>

          {/* User Autocomplete */}
          <UserAutocomplete
            onSelect={handleAssignUser}
            onError={(message) => {
              setError(message);
              showToast(message, 'error');
            }}
            disabled={isAssigningUser}
            placeholder="Search users by name or email..."
            excludeUserIds={assignedUsers.map(u => u.id)}
          />

          {/* Assigned Users List */}
          {assignedUsers.length > 0 ? (
            <div className="space-y-2">
              <div className="label">
                <span className="label-text-alt">
                  Currently Assigned ({assignedUsers.length})
                </span>
              </div>
              <div className="space-y-2">
                {assignedUsers.map((user) => (
                  <div
                    key={user.id}
                    className="flex items-center justify-between gap-3 bg-base-200 rounded-lg"
                  >
                    <div className="flex items-center gap-3 flex-1 min-w-0">
                      <div className="font-medium text-base-content truncate">
                        {user.name || user.email}
                      </div>
                      {user.name && (
                        <div className="text-sm text-base-content/60 truncate">
                          {user.email}
                        </div>
                      )}
                      {user.role && (
                        <div className="text-xs text-base-content/50">
                          {user.role.name}
                        </div>
                      )}
                    </div>
                    <button
                      type="button"
                      onClick={() => handleRemoveUser(user.id)}
                      className="btn btn-ghost btn-sm btn-circle flex-shrink-0"
                      aria-label="Remove user"
                      title="Remove user from bakery"
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
                No users assigned to this bakery yet.
              </p>
              <p className="text-sm text-base-content/50 mt-1">
                Use the search field above to find and assign users.
              </p>
            </div>
          )}
        </div>
      )}

      {showBottomActions && (
        <div className="flex gap-3 justify-between pt-4">
          {mode === 'edit' && bakery && (
            <button
              type="button"
              onClick={() => setShowDeleteModal(true)}
              className="btn btn-error btn-outline"
              disabled={isSubmitting || isDeleting || (bakery._count?.users ?? 0) > 0}
              title={
                (bakery._count?.users ?? 0) > 0
                  ? `Cannot delete bakery with ${bakery._count?.users} active user(s)`
                  : 'Delete this bakery'
              }
            >
              <Trash2 className="h-4 w-4" />
              Delete Bakery
            </button>
          )}
          <div className="flex gap-3 ml-auto">
            <button
              type="button"
              onClick={() => router.back()}
              className="btn btn-ghost"
              disabled={isSubmitting || isDeleting}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="btn btn-primary"
              disabled={isSubmitting || isDeleting}
            >
              {isSubmitting ? (
                <>
                  <span className="loading loading-spinner loading-sm"></span>
                  {mode === 'create' ? 'Creating...' : 'Saving...'}
                </>
              ) : (
                mode === 'create' ? 'Create Bakery' : 'Save Changes'
              )}
            </button>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal - only show when using bottom actions */}
      {showBottomActions && mode === 'edit' && bakery && (
        <>
          <input
            type="checkbox"
            id="delete-modal"
            className="modal-toggle"
            checked={showDeleteModal}
            onChange={() => setShowDeleteModal(!showDeleteModal)}
          />
          <div className="modal" role="dialog">
            <div className="modal-box">
              <h3 className="font-bold text-lg">Delete Bakery</h3>
              <p className="py-4">
                Are you sure you want to delete <strong>{bakery.name}</strong>? This action cannot be undone.
              </p>
              <div className="modal-action">
                <button
                  type="button"
                  onClick={() => setShowDeleteModal(false)}
                  className="btn btn-ghost"
                  disabled={isDeleting}
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleDelete}
                  className="btn btn-error"
                  disabled={isDeleting}
                >
                  {isDeleting ? (
                    <>
                      <span className="loading loading-spinner loading-sm"></span>
                      Deleting...
                    </>
                  ) : (
                    <>
                      <Trash2 className="h-4 w-4" />
                      Delete
                    </>
                  )}
                </button>
              </div>
            </div>
            <label className="modal-backdrop" htmlFor="delete-modal">Close</label>
          </div>
        </>
      )}
    </form>
  );
}
