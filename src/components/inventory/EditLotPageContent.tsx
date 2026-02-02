'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { SetPageHeader } from '@/components/layout/SetPageHeader';
import { EditLotForm } from '@/components/inventory/EditLotForm';
import { deleteInventoryLot } from '@/app/actions/inventory';
import { useToast } from '@/contexts/ToastContext';
import { Trash2 } from 'lucide-react';

interface Vendor {
  id: string;
  name: string;
}

interface Lot {
  id: string;
  purchaseQty: number;
  remainingQty: number;
  purchaseUnit: string;
  costPerUnit: number;
  purchasedAt: Date;
  expiresAt: Date | null;
  notes: string | null;
  vendor: Vendor | null;
  ingredient: {
    id: string;
    name: string;
    unit: string;
  };
}

interface EditLotPageContentProps {
  lot: Lot;
  vendors: Vendor[];
}

export function EditLotPageContent({ lot, vendors }: EditLotPageContentProps) {
  const router = useRouter();
  const { showToast } = useToast();
  const [formRef, setFormRef] = useState<HTMLFormElement | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);

  function handleSave() {
    if (formRef) {
      formRef.requestSubmit();
    }
  }

  async function handleDelete() {
    setIsDeleting(true);

    const result = await deleteInventoryLot(lot.id);

    if (result.success) {
      showToast('Lot deleted successfully', 'success');
      router.push(`/dashboard/ingredients/${lot.ingredient.id}`);
      router.refresh();
    } else {
      showToast(result.error || 'Failed to delete lot', 'error');
      setIsDeleting(false);
      setShowDeleteModal(false);
    }
  }

  return (
    <>
      <SetPageHeader
        title={`Edit Lot - ${lot.ingredient.name}`}
        sticky
        breadcrumbs={[
          { label: 'Ingredients', href: '/dashboard/ingredients' },
          { label: lot.ingredient.name, href: `/dashboard/ingredients/${lot.ingredient.id}` },
          { label: 'Lot', href: `/dashboard/inventory/lots/${lot.id}` },
          { label: 'Edit' },
        ]}
        actions={
          <button
            type="button"
            onClick={handleSave}
            className="btn btn-primary"
            disabled={isSaving || isDeleting}
          >
            {isSaving ? (
              <>
                <span className="loading loading-spinner loading-sm"></span>
                Saving...
              </>
            ) : (
              'Save Changes'
            )}
          </button>
        }
      />

      <EditLotForm
        lot={lot}
        vendors={vendors}
        onFormRefChange={setFormRef}
        onSavingChange={setIsSaving}
      />

      {/* Danger Zone */}
      <div className="max-w-2xl mx-auto mt-8">
        <div className="card bg-base-100 shadow-xl">
          <div className="card-body">
            <h2 className="card-title text-error">Danger Zone</h2>
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mt-4">
              <div>
                <h3 className="font-semibold">Delete this lot</h3>
                <p className="text-sm text-base-content/60 mt-1">
                  This will permanently delete this inventory lot. This action cannot be undone.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setShowDeleteModal(true)}
                className="btn btn-error"
                disabled={isSaving || isDeleting}
              >
                <Trash2 className="h-4 w-4" />
                Delete Lot
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
            id="delete-lot-modal"
            className="modal-toggle"
            checked={showDeleteModal}
            onChange={() => setShowDeleteModal(!showDeleteModal)}
          />
          <div className="modal modal-open" role="dialog">
            <div className="modal-box">
              <h3 className="font-bold text-lg">Delete Lot</h3>
              <p className="py-4">
                Are you sure you want to delete this inventory lot for <strong>{lot.ingredient.name}</strong>?
                This will remove {lot.remainingQty.toFixed(2)} {lot.purchaseUnit} from your inventory.
                This action cannot be undone.
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
            <label
              className="modal-backdrop"
              htmlFor="delete-lot-modal"
              onClick={() => setShowDeleteModal(false)}
            >
              Close
            </label>
          </div>
        </>
      )}
    </>
  );
}
