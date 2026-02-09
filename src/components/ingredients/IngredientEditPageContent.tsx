'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { SetPageHeader } from '@/components/layout/SetPageHeader';
import { IngredientForm } from '@/components/ingredients/IngredientForm';
import { deleteIngredient } from '@/app/actions/ingredient';
import { useToast } from '@/contexts/ToastContext';
import { Save, Trash2 } from 'lucide-react';
import type { Decimal } from '@prisma/client/runtime/library';

interface Vendor {
  id: string;
  name: string;
}

interface IngredientEditPageContentProps {
  bakeryId: string;
  ingredient: {
    id: string;
    name: string;
    currentQty: number | string | Decimal;
    unit: string;
    costPerUnit: number | string | Decimal;
    lowStockThreshold: number | null;
    vendors: Array<{
      vendor: Vendor;
    }>;
    _count?: {
      recipeUses: number;
      lots: number;
    };
  };
}

export function IngredientEditPageContent({
  bakeryId,
  ingredient,
}: IngredientEditPageContentProps) {
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
    if (!ingredient?.id) return;

    setIsDeleting(true);

    const result = await deleteIngredient(ingredient.id);

    if (result.success) {
      showToast(`Ingredient "${ingredient.name}" deleted successfully`, 'success');
      router.push('/dashboard/ingredients');
      router.refresh();
    } else {
      showToast(result.error || 'Failed to delete ingredient', 'error');
      setIsDeleting(false);
      setShowDeleteModal(false);
    }
  }

  const recipeCount = ingredient._count?.recipeUses ?? 0;
  const lotCount = ingredient._count?.lots ?? 0;
  const canDelete = recipeCount === 0 && lotCount === 0;

  function getDeletionBlockedMessage(): string {
    const blockers: string[] = [];
    if (recipeCount > 0) {
      blockers.push(`${recipeCount} recipe${recipeCount !== 1 ? 's' : ''}`);
    }
    if (lotCount > 0) {
      blockers.push(`${lotCount} inventory lot${lotCount !== 1 ? 's' : ''}`);
    }
    return `This ingredient is used in ${blockers.join(' and ')}. Remove these references before deleting.`;
  }

  return (
    <>
      <SetPageHeader
        title={`Edit ${ingredient.name}`}
        sticky
        hasUnsavedChanges={hasUnsavedChanges}
        breadcrumbs={[
          { label: 'Ingredients', href: '/dashboard/ingredients' },
          { label: ingredient.name, href: `/dashboard/ingredients/${ingredient.id}` },
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

      <IngredientForm
        bakeryId={bakeryId}
        ingredient={ingredient}
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
                <h3 className="font-semibold">Delete this ingredient</h3>
                <p className="text-sm text-base-content/60 mt-1">
                  {canDelete
                    ? 'Once you delete this ingredient, there is no going back. This action cannot be undone.'
                    : getDeletionBlockedMessage()}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setShowDeleteModal(true)}
                className="btn btn-error"
                disabled={isSaving || isDeleting || !canDelete}
              >
                <Trash2 className="h-4 w-4" />
                Delete Ingredient
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
            id="delete-ingredient-modal"
            className="modal-toggle"
            checked={showDeleteModal}
            onChange={() => setShowDeleteModal(!showDeleteModal)}
          />
          <div className="modal modal-open" role="dialog">
            <div className="modal-box">
              <h3 className="font-bold text-lg">Delete Ingredient</h3>
              <p className="py-4">
                Are you sure you want to delete <strong>{ingredient.name}</strong>?
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
            <label className="modal-backdrop" htmlFor="delete-ingredient-modal">Close</label>
          </div>
        </>
      )}
    </>
  );
}
