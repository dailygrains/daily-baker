'use client';

import { useState } from 'react';
import { SetPageHeader } from '@/components/layout/SetPageHeader';
import { RecipeForm } from '@/components/recipes/RecipeForm';

interface RecipeNewPageContentProps {
  bakeryId: string;
  availableIngredients: Array<{ id: string; name: string; unit: string }>;
}

export function RecipeNewPageContent({
  bakeryId,
  availableIngredients,
}: RecipeNewPageContentProps) {
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
        title="Add New Recipe"
        sticky
        breadcrumbs={[
          { label: 'Recipes', href: '/dashboard/recipes' },
          { label: 'New' },
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
                Saving...
              </>
            ) : (
              'Create Recipe'
            )}
          </button>
        }
      />

      <RecipeForm
        bakeryId={bakeryId}
        availableIngredients={availableIngredients}
        onFormRefChange={setFormRef}
        onSavingChange={setIsSaving}
        showBottomActions={false}
      />
    </>
  );
}
