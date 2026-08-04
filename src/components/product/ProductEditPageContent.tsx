'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { SetPageHeader } from '@/components/layout/SetPageHeader';
import { ProductForm } from '@/components/product/ProductForm';
import { deleteProduct } from '@/app/actions/product';
import { useToast } from '@/contexts/ToastContext';
import { Trash2, Save } from 'lucide-react';

interface ProductEditPageContentProps {
  bakeryId: string;
  product: {
    id: string;
    name: string;
    sku: string | null;
    description: string | null;
    recipeId: string;
    recipeScale: number;
    batchYieldQty: number;
    laborCost: number;
    overheadCost: number;
    retailPrice: number | null;
    wholesalePrice: number | null;
    targetMarginPct: number | null;
    productSupplies: Array<{
      supply: { id: string; name: string; unit: string; costPerUnit: number; category: string };
      quantity: number;
      unit: string;
      wasteFactor: number;
      costOverride: number | null;
      notes: string | null;
    }>;
  };
  recipes: Array<{ id: string; name: string; totalCost: number }>;
  supplies: Array<{ id: string; name: string; unit: string; costPerUnit: number; category: string }>;
}

export function ProductEditPageContent({
  bakeryId,
  product,
  recipes,
  supplies,
}: ProductEditPageContentProps) {
  const router = useRouter();
  const { showToast } = useToast();
  const [isDeleting, setIsDeleting] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [formRef, setFormRef] = useState<HTMLFormElement | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);

  async function handleDelete() {
    if (!product?.id) return;
    setIsDeleting(true);
    const result = await deleteProduct(product.id);
    if (result.success) {
      showToast(`Product "${product.name}" deleted successfully`, 'success');
      router.push('/dashboard/products');
      router.refresh();
    } else {
      showToast(result.error || 'Failed to delete product', 'error');
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
        title={`Edit ${product.name}`}
        sticky
        hasUnsavedChanges={hasUnsavedChanges}
        breadcrumbs={[
          { label: 'Products', href: '/dashboard/products' },
          { label: product.name, href: `/dashboard/products/${product.id}` },
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

      <ProductForm
        bakeryId={bakeryId}
        product={product}
        recipes={recipes}
        supplies={supplies}
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
                <h3 className="font-semibold">Delete this product</h3>
                <p className="text-sm text-base-content/60 mt-1">
                  Once deleted, this cannot be undone. This will permanently remove the product and its supply BOM.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setShowDeleteModal(true)}
                className="btn btn-error"
                disabled={isSaving || isDeleting}
              >
                <Trash2 className="h-4 w-4" />
                Delete Product
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
              <h3 className="font-bold text-lg">Delete Product</h3>
              <p className="py-4">
                Are you sure you want to delete <strong>{product.name}</strong>? This action cannot be undone.
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
