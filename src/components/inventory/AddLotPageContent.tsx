'use client';

import { useState } from 'react';
import { SetPageHeader } from '@/components/layout/SetPageHeader';
import { AddLotForm } from '@/components/inventory/AddLotForm';

interface Ingredient {
  id: string;
  name: string;
  unit: string;
}

interface Vendor {
  id: string;
  name: string;
}

interface AddLotPageContentProps {
  ingredients: Ingredient[];
  vendors: Vendor[];
  preselectedIngredientId?: string;
}

export function AddLotPageContent({
  ingredients,
  vendors,
  preselectedIngredientId,
}: AddLotPageContentProps) {
  const [formRef, setFormRef] = useState<HTMLFormElement | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  function handleSave() {
    if (formRef) {
      formRef.requestSubmit();
    }
  }

  return (
    <>
      <SetPageHeader
        title="Add Inventory Lot"
        sticky
        breadcrumbs={[
          { label: 'Inventory', href: '/dashboard/inventory' },
          { label: 'New Lot' },
        ]}
        actions={
          <button
            type="button"
            onClick={handleSave}
            className="btn btn-primary"
            disabled={isSaving}
          >
            {isSaving ? (
              <>
                <span className="loading loading-spinner loading-sm"></span>
                Adding...
              </>
            ) : (
              'Add Lot'
            )}
          </button>
        }
      />

      <AddLotForm
        ingredients={ingredients}
        vendors={vendors}
        preselectedIngredientId={preselectedIngredientId}
        onFormRefChange={setFormRef}
        onSavingChange={setIsSaving}
      />
    </>
  );
}
