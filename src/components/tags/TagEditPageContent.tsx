'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { SetPageHeader } from '@/components/layout/SetPageHeader';
import { TagForm } from '@/components/tags/TagForm';
import { deleteTag } from '@/app/actions/tag';
import { useToast } from '@/contexts/ToastContext';
import type { Tag, TagType } from '@/generated/prisma';
import { Trash2, Save } from 'lucide-react';

interface TagEditPageContentProps {
  bakeryId: string;
  tagTypes: TagType[];
  tag: Tag & {
    tagType: TagType;
    _count: {
      entityTags: number;
    };
  };
}

export function TagEditPageContent({
  bakeryId,
  tagTypes,
  tag,
}: TagEditPageContentProps) {
  const router = useRouter();
  const { showToast } = useToast();
  const [isDeleting, setIsDeleting] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [formRef, setFormRef] = useState<HTMLFormElement | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);

  async function handleDelete() {
    if (!tag?.id) return;

    setIsDeleting(true);

    const result = await deleteTag(tag.id);

    if (result.success) {
      showToast(`Tag "${tag.name}" deleted successfully`, 'success');
      router.push('/dashboard/tags');
      router.refresh();
    } else {
      showToast(result.error || 'Failed to delete tag', 'error');
      setIsDeleting(false);
      setShowDeleteModal(false);
    }
  }

  function handleSave() {
    if (formRef) {
      formRef.requestSubmit();
    }
  }

  const usageCount = tag._count?.entityTags ?? 0;

  return (
    <>
      <SetPageHeader
        title={`Edit ${tag.name}`}
        sticky
        hasUnsavedChanges={hasUnsavedChanges}
        breadcrumbs={[
          { label: 'Tags', href: '/dashboard/tags' },
          { label: tag.name, href: `/dashboard/tags/${tag.id}` },
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

      <TagForm
        bakeryId={bakeryId}
        tagTypes={tagTypes}
        tag={tag}
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
                <h3 className="font-semibold">Delete this tag</h3>
                <p className="text-sm text-base-content/60 mt-1">
                  {usageCount > 0
                    ? `This tag is used by ${usageCount} item${usageCount !== 1 ? 's' : ''}. Deleting it will remove the tag from all items.`
                    : 'Once you delete this tag, there is no going back. This action cannot be undone.'
                  }
                </p>
              </div>
              <button
                type="button"
                onClick={() => setShowDeleteModal(true)}
                className="btn btn-error"
                disabled={isSaving || isDeleting}
              >
                <Trash2 className="h-4 w-4" />
                Delete Tag
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
              <h3 className="font-bold text-lg">Delete Tag</h3>
              <p className="py-4">
                Are you sure you want to delete <strong>{tag.name}</strong>?
                {usageCount > 0 && (
                  <span className="text-warning block mt-2">
                    This tag is currently assigned to {usageCount} item{usageCount !== 1 ? 's' : ''}.
                  </span>
                )}
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
