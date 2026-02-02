'use client';

import { useState } from 'react';
import { PageHeader } from '@/components/ui/PageHeader';
import { IngredientForm } from '@/components/ingredients/IngredientForm';
import { Save, ArrowLeft } from 'lucide-react';
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
    lowStockThreshold: number | null;
    vendors: Array<{
      vendor: Vendor;
    }>;
  };
}

export function IngredientEditPageContent({
  bakeryId,
  ingredient,
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
    <>
      <PageHeader
        title={`Edit ${ingredient.name}`}
        sticky
        breadcrumbs={[
          { label: 'Ingredients', href: '/dashboard/ingredients' },
          { label: ingredient.name, href: `/dashboard/ingredients/${ingredient.id}` },
          { label: 'Edit' },
        ]}
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
                  <Save className="h-5 w-5 mr-2" />
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
    </>
  );
}
