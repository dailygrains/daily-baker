'use client';

import { useState } from 'react';
import { SetPageHeader } from '@/components/layout/SetPageHeader';
import { TagTypeForm } from '@/components/tag-types/TagTypeForm';
import { Save } from 'lucide-react';

interface TagTypeNewPageContentProps {
  bakeryId: string;
}

export function TagTypeNewPageContent({
  bakeryId,
}: TagTypeNewPageContentProps) {
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
        title="Add New Tag Type"
        sticky
        breadcrumbs={[
          { label: 'Tag Types', href: '/dashboard/tag-types' },
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
                <Save className="h-4 w-4" />
                Create Tag Type
              </>
            )}
          </button>
        }
      />

      <TagTypeForm
        bakeryId={bakeryId}
        onFormRefChange={setFormRef}
        onSavingChange={setIsSaving}
        showBottomActions={false}
      />
    </>
  );
}
