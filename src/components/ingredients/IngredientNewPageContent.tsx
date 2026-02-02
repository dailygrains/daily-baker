'use client';

import { useState } from 'react';
import { SetPageHeader } from '@/components/layout/SetPageHeader';
import { IngredientForm } from '@/components/ingredients/IngredientForm';
import { Save, ArrowLeft } from 'lucide-react';
import Link from 'next/link';

interface IngredientNewPageContentProps {
  bakeryId: string;
}

export function IngredientNewPageContent({
  bakeryId,
}: IngredientNewPageContentProps) {
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
        title="Add New Ingredient"
        sticky
        actions={
          <>
            <Link href="/dashboard/ingredients" className="btn btn-ghost">
              <ArrowLeft className="h-5 w-5 mr-2" />
              Back
            </Link>
            <button
              type="button"
              onClick={handleSave}
              className="btn btn-primary"
              disabled={isSaving}
            >
              {isSaving ? (
                <>
                  <span className="loading loading-spinner loading-sm"></span>
                  Creating...
                </>
              ) : (
                <>
                  <Save className="h-5 w-5 mr-2" />
                  Create Ingredient
                </>
              )}
            </button>
          </>
        }
      />

      <IngredientForm
        bakeryId={bakeryId}
        onFormRefChange={setFormRef}
        onSavingChange={setIsSaving}
        showBottomActions={false}
      />
    </>
  );
}
