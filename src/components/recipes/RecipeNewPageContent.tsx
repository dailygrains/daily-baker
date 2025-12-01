'use client';

import { useState } from 'react';
import { PageHeader } from '@/components/ui/PageHeader';
import { RecipeForm } from '@/components/recipes/RecipeForm';
import { ArrowLeft } from 'lucide-react';
import Link from 'next/link';

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
      <PageHeader
        title="Add New Recipe"
        sticky
        actions={
          <>
            <Link href="/dashboard/recipes" className="btn btn-ghost">
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
                  Saving...
                </>
              ) : (
                'Create Recipe'
              )}
            </button>
          </>
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
