'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { SetPageHeader } from '@/components/layout/SetPageHeader';
import { SupplyForm } from '@/components/supply/SupplyForm';
import { deleteSupply } from '@/app/actions/supply';
import { useToast } from '@/contexts/ToastContext';
import type { Supply } from '@/generated/prisma';
import { Trash2, Save } from 'lucide-react';

interface SupplyEditPageContentProps {
  bakeryId: string;
  supply: Omit<Supply, 'costPerUnit' | 'quantityOnHand' | 'lowStockThreshold'> & {
    costPerUnit: number;
    quantityOnHand: number;
    lowStockThreshold: number | null;
    vendors: Array<{ vendor: { id: string; name: string; email: string | null; phone: string | null } }>;
  };
  vendors: Array<{ id: string; name: string }>;
}

export function SupplyEditPageContent({
  bakeryId,
  supply,
  vendors,
}: SupplyEditPageContentProps) {
  const router = useRouter();
  const { showToast } = useToast();
  const [isDeleting, setIsDeleting] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [formRef, setFormRef] = useState<HTMLFormElement | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);

  async function handleDelete() {
    if (!supply?.id) return;
    setIsDeleting(true);
    const result = await deleteSupply(supply.id);
    if (result.success) {
      showToast(`Supply "${supply.name}" deleted successfully`, 'success');
      router.push('/dashboard/supplies');
      router.refresh();
    } else {
      showToast(result.error || 'Failed to delete supply', 'error');
      setIsDeleting(false);
      setShowDeleteModal(false);
    }
  }

  function handleSave() {
    if (formRef) formRef.requestSubmit();
  }

  return (
    <>
      <SetPageHeader
        title={`Edit ${supply.name}`}
        sticky
        hasUnsavedChanges={hasUnsavedChanges}
        breadcrumbs={[
          { label: 'Supplies', href: '/dashboard/supplies' },
          { label: supply.name, href: `/dashboard/supplies/${supply.id}` },
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

      <SupplyForm
        bakeryId={bakeryId}
        supply={supply}
        vendors={vendors}
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
                <h3 className="font-semibold">Delete this supply</h3>
                <p className="text-sm text-base-content/60 mt-1">
                  Once deleted, this cannot be undone. Supplies used in products cannot be deleted.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setShowDeleteModal(true)}
                className="btn btn-error"
                disabled={isSaving || isDeleting}
              >
                <Trash2 className="h-4 w-4" />
                Delete Supply
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Delete Confirmation Modal */}
      {showDeleteModal && (
        <>
          <input type="checkbox" id="delete-modal" className="modal-toggle" checked={showDeleteModal} onChange={() => setShowDeleteModal(!showDeleteModal)} />
          <div className="modal" role="dialog">
            <div className="modal-box">
              <h3 className="font-bold text-lg">Delete Supply</h3>
              <p className="py-4">
                Are you sure you want to delete <strong>{supply.name}</strong>? This action cannot be undone.
              </p>
              <div className="modal-action">
                <button type="button" onClick={() => setShowDeleteModal(false)} className="btn btn-ghost" disabled={isDeleting}>Cancel</button>
                <button type="button" onClick={handleDelete} className="btn btn-error" disabled={isDeleting}>
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
