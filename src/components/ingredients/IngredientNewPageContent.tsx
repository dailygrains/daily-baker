'use client';

import { useState } from 'react';
import { PageHeader } from '@/components/ui/PageHeader';
import { IngredientForm } from '@/components/ingredients/IngredientForm';
import { Save, ArrowLeft } from 'lucide-react';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import Link from 'next/link';

interface IngredientNewPageContentProps {
  bakeryId: string;
  isPlatformAdmin: boolean;
  bakeries?: { id: string; name: string; }[];
  currentBakeryId: string | null;
}

export function IngredientNewPageContent({
  bakeryId,
  isPlatformAdmin,
  bakeries,
  currentBakeryId,
}: IngredientNewPageContentProps) {
  const [formRef, setFormRef] = useState<HTMLFormElement | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  function handleSave() {
    if (formRef) {
      formRef.requestSubmit();
    }
  }

  return (
    <DashboardLayout
      isPlatformAdmin={isPlatformAdmin}
      bakeries={bakeries}
      currentBakeryId={currentBakeryId}
    >
      <PageHeader
        title="Add New Ingredient"
        description="Add a new ingredient to your inventory"
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
                  <Save className="h-4 w-4" />
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
    </DashboardLayout>
  );
}
