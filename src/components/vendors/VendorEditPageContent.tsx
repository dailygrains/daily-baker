'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { SetPageHeader } from '@/components/layout/SetPageHeader';
import { VendorForm } from '@/components/vendors/VendorForm';
import { deleteVendor } from '@/app/actions/vendor';
import { useToast } from '@/contexts/ToastContext';
import type { Vendor } from '@/generated/prisma';
import { Trash2, Save } from 'lucide-react';

interface VendorEditPageContentProps {
  bakeryId: string;
  vendor: Vendor & {
    _count: {
      ingredients: number;
      equipment: number;
      inventoryLots: number;
    };
  };
}

export function VendorEditPageContent({
  bakeryId,
  vendor,
}: VendorEditPageContentProps) {
  const router = useRouter();
  const { showToast } = useToast();
  const [isDeleting, setIsDeleting] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [formRef, setFormRef] = useState<HTMLFormElement | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);

  async function handleDelete() {
    if (!vendor?.id) return;

    setIsDeleting(true);

    const result = await deleteVendor(vendor.id);

    if (result.success) {
      showToast(`Vendor "${vendor.name}" deleted successfully`, 'success');
      router.push('/dashboard/vendors');
      router.refresh();
    } else {
      showToast(result.error || 'Failed to delete vendor', 'error');
      setIsDeleting(false);
      setShowDeleteModal(false);
    }
  }

  function handleSave() {
    if (formRef) {
      formRef.requestSubmit();
    }
  }

  const ingredientCount = vendor._count?.ingredients ?? 0;
  const equipmentCount = vendor._count?.equipment ?? 0;
  const lotCount = vendor._count?.inventoryLots ?? 0;
  const totalUsage = ingredientCount + equipmentCount + lotCount;
  const canDelete = totalUsage === 0;

  let deleteReason = '';
  if (!canDelete) {
    const reasons = [];
    if (ingredientCount > 0) {
      reasons.push(`${ingredientCount} ingredient${ingredientCount === 1 ? '' : 's'}`);
    }
    if (equipmentCount > 0) {
      reasons.push(`${equipmentCount} equipment item${equipmentCount === 1 ? '' : 's'}`);
    }
    if (lotCount > 0) {
      reasons.push(`${lotCount} inventory lot${lotCount === 1 ? '' : 's'}`);
    }
    deleteReason = `This vendor cannot be deleted because it is linked to ${reasons.join(', ')}. Please unlink these items before deleting.`;
  }

  return (
    <>
      <SetPageHeader
        title={`Edit ${vendor.name}`}
        sticky
        hasUnsavedChanges={hasUnsavedChanges}
        breadcrumbs={[
          { label: 'Vendors', href: '/dashboard/vendors' },
          { label: vendor.name, href: `/dashboard/vendors/${vendor.id}` },
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

      <VendorForm
        bakeryId={bakeryId}
        vendor={vendor}
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
                <h3 className="font-semibold">Delete this vendor</h3>
                <p className="text-sm text-base-content/60 mt-1">
                  {canDelete
                    ? 'Once you delete this vendor, there is no going back. This action cannot be undone.'
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
                Delete Vendor
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
              <h3 className="font-bold text-lg">Delete Vendor</h3>
              <p className="py-4">
                Are you sure you want to delete <strong>{vendor.name}</strong>? This action cannot be undone.
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
