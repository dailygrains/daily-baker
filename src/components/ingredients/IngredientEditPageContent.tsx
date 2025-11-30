'use client';

import { useState } from 'react';
import { PageHeader } from '@/components/ui/PageHeader';
import { IngredientForm } from '@/components/ingredients/IngredientForm';
import { Save, ArrowLeft } from 'lucide-react';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import Link from 'next/link';
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
    vendors: Array<{
      vendor: Vendor;
    }>;
  };
  isPlatformAdmin: boolean;
  bakeries?: { id: string; name: string; }[];
  currentBakeryId: string | null;
}

export function IngredientEditPageContent({
  bakeryId,
  ingredient,
  isPlatformAdmin,
  bakeries,
  currentBakeryId,
}: IngredientEditPageContentProps) {
  const [formRef, setFormRef] = useState<HTMLFormElement | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);

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
        title={`Edit ${ingredient.name}`}
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
              disabled={isSaving || !hasUnsavedChanges}
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
          </>
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
    </DashboardLayout>
  );
}
