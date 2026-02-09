'use client';

import { useState } from 'react';
import { SetPageHeader } from '@/components/layout/SetPageHeader';
import { TagForm } from '@/components/tags/TagForm';
import { Save } from 'lucide-react';
import type { TagType } from '@/generated/prisma';

interface TagNewPageContentProps {
  bakeryId: string;
  tagTypes: TagType[];
  defaultTagTypeId?: string;
}

export function TagNewPageContent({
  bakeryId,
  tagTypes,
  defaultTagTypeId,
}: TagNewPageContentProps) {
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
        title="Add New Tag"
        sticky
        breadcrumbs={[
          { label: 'Tags', href: '/dashboard/tags' },
          { label: 'New' },
        ]}
        actions={
          <button
            type="button"
            onClick={handleSave}
            className="btn btn-primary"
            disabled={isSaving || tagTypes.length === 0}
          >
            {isSaving ? (
              <>
                <span className="loading loading-spinner loading-sm"></span>
                Creating...
              </>
            ) : (
              <>
                <Save className="h-4 w-4" />
                Create Tag
              </>
            )}
          </button>
        }
      />

      <TagForm
        bakeryId={bakeryId}
        tagTypes={tagTypes}
        defaultTagTypeId={defaultTagTypeId}
        onFormRefChange={setFormRef}
        onSavingChange={setIsSaving}
        showBottomActions={false}
      />
    </>
  );
}
