'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { SetPageHeader } from '@/components/layout/SetPageHeader';
import { UserAssignmentForm } from '@/components/user/UserAssignmentForm';
import { deleteUser } from '@/app/actions/user';
import { useToast } from '@/contexts/ToastContext';
import type { User, Bakery, Role } from '@/generated/prisma';
import { Trash2, Save } from 'lucide-react';

interface UserEditPageContentProps {
  user: User & {
    bakeries: {
      bakery: Bakery;
    }[];
    role: Role | null;
    _count: {
      inventoryUsages: number;
      sentInvitations: number;
    };
  };
  bakeries: Bakery[];
  roles: Role[];
}

export function UserEditPageContent({
  user,
  bakeries,
  roles,
}: UserEditPageContentProps) {
  const router = useRouter();
  const { showToast } = useToast();
  const [isDeleting, setIsDeleting] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [formRef, setFormRef] = useState<HTMLFormElement | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);

  async function handleDelete() {
    if (!user?.id) return;

    setIsDeleting(true);

    const result = await deleteUser(user.id);

    if (result.success) {
      showToast(`User "${user.name || user.email}" deleted successfully`, 'success');
      router.push('/admin/users');
      router.refresh();
    } else {
      showToast(result.error || 'Failed to delete user', 'error');
      setIsDeleting(false);
      setShowDeleteModal(false);
    }
  }

  function handleSave() {
    if (formRef) {
      formRef.requestSubmit();
    }
  }

  const usageCount = user._count?.inventoryUsages ?? 0;
  const invitationCount = user._count?.sentInvitations ?? 0;
  const canDelete = usageCount === 0 && invitationCount === 0;

  let deleteReason = '';
  if (!canDelete) {
    const reasons = [];
    if (usageCount > 0) {
      reasons.push(`${usageCount} inventory usage record${usageCount === 1 ? '' : 's'}`);
    }
    if (invitationCount > 0) {
      reasons.push(`${invitationCount} sent invitation${invitationCount === 1 ? '' : 's'}`);
    }
    deleteReason = `This user cannot be deleted because they have ${reasons.join(' and ')}. Please reassign or remove these items before deleting.`;
  }

  return (
    <>
      <SetPageHeader
        title={`Edit User: ${user.name || user.email}`}
        sticky
        breadcrumbs={[
          { label: 'Users', href: '/admin/users' },
          { label: user.name || user.email },
        ]}
        actions={
          <button
            type="button"
            onClick={handleSave}
            className="btn btn-primary"
            disabled={isSaving || isDeleting || !hasUnsavedChanges}
          >
            {isSaving ? (
              <>
                <span className="loading loading-spinner loading-sm"></span>
                Saving...
              </>
            ) : (
              <>
                <Save className="h-4 w-4" />
                Save Changes
              </>
            )}
          </button>
        }
      />

      <UserAssignmentForm
        user={user}
        bakeries={bakeries}
        roles={roles}
        onFormRefChange={setFormRef}
        onSavingChange={setIsSaving}
        onUnsavedChangesChange={setHasUnsavedChanges}
        showBottomActions={false}
      />

      {/* Danger Zone */}
      <div className="max-w-3xl mx-auto mt-8">
        <div className="card bg-base-100 shadow-sm">
          <div className="card-body">
            <h2 className="card-title text-error">Danger Zone</h2>
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mt-4">
              <div>
                <h3 className="font-semibold">Delete this user</h3>
                <p className="text-sm text-base-content/60 mt-1">
                  {canDelete
                    ? 'Once you delete this user, there is no going back. This action cannot be undone.'
                    : deleteReason
                  }
                </p>
              </div>
              <button
                type="button"
                onClick={() => setShowDeleteModal(true)}
                className="btn btn-error"
                disabled={isSaving || isDeleting || !canDelete}
              >
                <Trash2 className="h-4 w-4" />
                Delete User
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Delete Confirmation Modal */}
      {showDeleteModal && (
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
              <h3 className="font-bold text-lg">Delete User</h3>
              <p className="py-4">
                Are you sure you want to delete <strong>{user.name || user.email}</strong>? This action cannot be undone.
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
    </>
  );
}
