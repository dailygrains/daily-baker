'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { SetPageHeader } from '@/components/layout/SetPageHeader';
import { RoleForm } from '@/components/role/RoleForm';
import { deleteRole } from '@/app/actions/role';
import { useToast } from '@/contexts/ToastContext';
import type { Role } from '@/generated/prisma';
import { Trash2, Save } from 'lucide-react';

interface RoleEditPageContentProps {
  role: Role & {
    _count: {
      users: number;
    };
  };
}

export function RoleEditPageContent({ role }: RoleEditPageContentProps) {
  const router = useRouter();
  const { showToast } = useToast();
  const [isDeleting, setIsDeleting] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [formRef, setFormRef] = useState<HTMLFormElement | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);

  async function handleDelete() {
    if (!role?.id) return;

    setIsDeleting(true);

    const result = await deleteRole(role.id);

    if (result.success) {
      showToast(`Role "${role.name}" deleted successfully`, 'success');
      router.push('/admin/roles');
      router.refresh();
    } else {
      showToast(result.error || 'Failed to delete role', 'error');
      setIsDeleting(false);
      setShowDeleteModal(false);
    }
  }

  function handleSave() {
    if (formRef) {
      formRef.requestSubmit();
    }
  }

  const userCount = role._count?.users ?? 0;
  const canDelete = userCount === 0;

  return (
    <>
      <SetPageHeader
        title={`Edit Platform Role: ${role.name}`}
        sticky
        breadcrumbs={[
          { label: 'Roles', href: '/admin/roles' },
          { label: role.name },
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

      <RoleForm
        role={role}
        mode="edit"
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
                <h3 className="font-semibold">Delete this role</h3>
                <p className="text-sm text-base-content/60 mt-1">
                  {canDelete
                    ? 'Once you delete this role, there is no going back. This action cannot be undone.'
                    : `This role cannot be deleted because it has ${userCount} assigned user${userCount === 1 ? '' : 's'}. Please reassign all users before deleting.`
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
                Delete Role
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
              <h3 className="font-bold text-lg">Delete Role</h3>
              <p className="py-4">
                Are you sure you want to delete <strong>{role.name}</strong>? This action cannot be undone.
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
