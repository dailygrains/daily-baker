'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { SetPageHeader } from '@/components/layout/SetPageHeader';
import { EquipmentForm } from '@/components/equipment/EquipmentForm';
import { deleteEquipment } from '@/app/actions/equipment';
import { useToast } from '@/contexts/ToastContext';
import type { Equipment } from '@/generated/prisma';
import { Trash2, Save } from 'lucide-react';

interface EquipmentEditPageContentProps {
  bakeryId: string;
  equipment: Omit<Equipment, 'cost'> & { cost: number | null } & { vendor: { id: string; name: string; email: string | null; phone: string | null } | null };
  vendors: Array<{ id: string; name: string }>;
}

export function EquipmentEditPageContent({
  bakeryId,
  equipment,
  vendors,
}: EquipmentEditPageContentProps) {
  const router = useRouter();
  const { showToast } = useToast();
  const [isDeleting, setIsDeleting] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [formRef, setFormRef] = useState<HTMLFormElement | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);

  async function handleDelete() {
    if (!equipment?.id) return;

    setIsDeleting(true);

    const result = await deleteEquipment(equipment.id);

    if (result.success) {
      showToast(`Equipment "${equipment.name}" deleted successfully`, 'success');
      router.push('/dashboard/equipment');
      router.refresh();
    } else {
      showToast(result.error || 'Failed to delete equipment', 'error');
      setIsDeleting(false);
      setShowDeleteModal(false);
    }
  }

  function handleSave() {
    if (formRef) {
      formRef.requestSubmit();
    }
  }

  return (
    <>
      <SetPageHeader
        title={`Edit ${equipment.name}`}
        sticky
        hasUnsavedChanges={hasUnsavedChanges}
        breadcrumbs={[
          { label: 'Equipment', href: '/dashboard/equipment' },
          { label: equipment.name, href: `/dashboard/equipment/${equipment.id}` },
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

      <EquipmentForm
        bakeryId={bakeryId}
        equipment={equipment}
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
                <h3 className="font-semibold">Delete this equipment</h3>
                <p className="text-sm text-base-content/60 mt-1">
                  Once you delete this equipment, there is no going back. This action cannot be undone.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setShowDeleteModal(true)}
                className="btn btn-error"
                disabled={isSaving || isDeleting}
              >
                <Trash2 className="h-4 w-4" />
                Delete Equipment
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
              <h3 className="font-bold text-lg">Delete Equipment</h3>
              <p className="py-4">
                Are you sure you want to delete <strong>{equipment.name}</strong>? This action cannot be undone.
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
