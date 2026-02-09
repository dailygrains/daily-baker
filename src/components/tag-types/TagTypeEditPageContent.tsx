'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { SetPageHeader } from '@/components/layout/SetPageHeader';
import { TagTypeForm } from '@/components/tag-types/TagTypeForm';
import { deleteTagType } from '@/app/actions/tag';
import { useToast } from '@/contexts/ToastContext';
import type { TagType } from '@/generated/prisma';
import { Trash2, Save } from 'lucide-react';

interface TagTypeEditPageContentProps {
  bakeryId: string;
  tagType: TagType & {
    _count: {
      tags: number;
    };
  };
}

export function TagTypeEditPageContent({
  bakeryId,
  tagType,
}: TagTypeEditPageContentProps) {
  const router = useRouter();
  const { showToast } = useToast();
  const [isDeleting, setIsDeleting] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [formRef, setFormRef] = useState<HTMLFormElement | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);

  async function handleDelete() {
    if (!tagType?.id) return;

    setIsDeleting(true);

    const result = await deleteTagType(tagType.id);

    if (result.success) {
      showToast(`Tag type "${tagType.name}" deleted successfully`, 'success');
      router.push('/dashboard/tag-types');
      router.refresh();
    } else {
      showToast(result.error || 'Failed to delete tag type', 'error');
      setIsDeleting(false);
      setShowDeleteModal(false);
    }
  }

  function handleSave() {
    if (formRef) {
      formRef.requestSubmit();
    }
  }

  const tagCount = tagType._count?.tags ?? 0;
  const canDelete = tagCount === 0;

  let deleteReason = '';
  if (!canDelete) {
    deleteReason = `This tag type cannot be deleted because it has ${tagCount} tag${tagCount === 1 ? '' : 's'}. Remove all tags first.`;
  }

  return (
    <>
      <SetPageHeader
        title={`Edit ${tagType.name}`}
        sticky
        hasUnsavedChanges={hasUnsavedChanges}
        breadcrumbs={[
          { label: 'Tag Types', href: '/dashboard/tag-types' },
          { label: tagType.name, href: `/dashboard/tag-types/${tagType.id}` },
          { label: 'Edit' },
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

      <TagTypeForm
        bakeryId={bakeryId}
        tagType={tagType}
        onFormRefChange={setFormRef}
        onSavingChange={setIsSaving}
        onUnsavedChangesChange={setHasUnsavedChanges}
        showBottomActions={false}
      />

      {/* Danger Zone */}
      <div className="mt-8">
        <div className="card bg-base-100 shadow-sm">
          <div className="card-body">
            <h2 className="card-title text-error">Danger Zone</h2>
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mt-4">
              <div>
                <h3 className="font-semibold">Delete this tag type</h3>
                <p className="text-sm text-base-content/60 mt-1">
                  {canDelete
                    ? 'Once you delete this tag type, there is no going back. This action cannot be undone.'
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
                Delete Tag Type
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
              <h3 className="font-bold text-lg">Delete Tag Type</h3>
              <p className="py-4">
                Are you sure you want to delete <strong>{tagType.name}</strong>? This action cannot be undone.
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
