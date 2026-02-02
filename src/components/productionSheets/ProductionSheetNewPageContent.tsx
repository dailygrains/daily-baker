'use client';

import { useState } from 'react';
import { SetPageHeader } from '@/components/layout/SetPageHeader';
import { ProductionSheetForm } from '@/components/productionSheets/ProductionSheetForm';
import { Save } from 'lucide-react';

type Recipe = {
  id: string;
  name: string;
  totalCost: number | null;
  yieldQty: number;
  yieldUnit: string;
};

interface ProductionSheetNewPageContentProps {
  bakeryId: string;
  recipes: Recipe[];
}

export function ProductionSheetNewPageContent({
  bakeryId,
  recipes,
}: ProductionSheetNewPageContentProps) {
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
        title="New Production Sheet"
        sticky
        breadcrumbs={[
          { label: 'Production Sheets', href: '/dashboard/production-sheets' },
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
                Creating...
              </>
            ) : (
              <>
                <Save className="h-5 w-5 mr-2" />
                Create Production Sheet
              </>
            )}
          </button>
        }
      />

      <ProductionSheetForm
        bakeryId={bakeryId}
        recipes={recipes}
        onFormRefChange={setFormRef}
        onSavingChange={setIsSaving}
        showBottomActions={false}
      />
    </>
  );
}
