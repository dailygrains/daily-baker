'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { SetPageHeader } from '@/components/layout/SetPageHeader';
import { ProductionSheetForm } from '@/components/productionSheets/ProductionSheetForm';
import { deleteProductionSheet } from '@/app/actions/productionSheet';
import { useToast } from '@/contexts/ToastContext';
import { Save, Trash2 } from 'lucide-react';

type Recipe = {
  id: string;
  name: string;
  totalCost: number | null;
  yieldQty: number;
  yieldUnit: string;
};

type ExistingSheet = {
  id: string;
  description: string | null;
  scheduledFor: Date | null;
  notes: string | null;
  recipes: Array<{
    recipeId: string;
    scale: number;
    order: number;
  }>;
};

interface ProductionSheetEditPageContentProps {
  bakeryId: string;
  recipes: Recipe[];
  existingSheet: ExistingSheet;
  displayName: string;
}

export function ProductionSheetEditPageContent({
  bakeryId,
  recipes,
  existingSheet,
  displayName,
}: ProductionSheetEditPageContentProps) {
  const router = useRouter();
  const { showToast } = useToast();
  const [formRef, setFormRef] = useState<HTMLFormElement | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);

  function handleSave() {
    if (formRef) {
      formRef.requestSubmit();
    }
  }

  async function handleDelete() {
    if (!existingSheet?.id) return;

    setIsDeleting(true);

    const result = await deleteProductionSheet(existingSheet.id);

    if (result.success) {
      showToast(`Production sheet "${displayName}" deleted successfully`, 'success');
      router.push('/dashboard/production-sheets');
      router.refresh();
    } else {
      showToast(result.error || 'Failed to delete production sheet', 'error');
      setIsDeleting(false);
      setShowDeleteModal(false);
    }
  }

  return (
    <>
      <SetPageHeader
        title={`Edit ${displayName}`}
        sticky
        hasUnsavedChanges={hasUnsavedChanges}
        breadcrumbs={[
          { label: 'Production Sheets', href: '/dashboard/production-sheets' },
          { label: displayName, href: `/dashboard/production-sheets/${existingSheet.id}` },
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
                <Save className="h-5 w-5 mr-2" />
                Save Changes
              </>
            )}
          </button>
        }
      />

      <ProductionSheetForm
        bakeryId={bakeryId}
        recipes={recipes}
        existingSheet={existingSheet}
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
                <h3 className="font-semibold">Delete this production sheet</h3>
                <p className="text-sm text-base-content/60 mt-1">
                  Once you delete this production sheet, there is no going back. This action cannot be undone.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setShowDeleteModal(true)}
                className="btn btn-error"
                disabled={isSaving || isDeleting}
              >
                <Trash2 className="h-4 w-4" />
                Delete Production Sheet
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
              <h3 className="font-bold text-lg">Delete Production Sheet</h3>
              <p className="py-4">
                Are you sure you want to delete <strong>{displayName}</strong>? This action cannot be undone.
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
