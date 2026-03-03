'use client';

import { useState } from 'react';
import { SetPageHeader } from '@/components/layout/SetPageHeader';
import { InvitationForm } from '@/components/invitation/InvitationForm';
import { Save } from 'lucide-react';
import type { Bakery, Role } from '@/generated/prisma';

interface InvitationNewPageContentProps {
  bakeries: Bakery[];
  roles: Role[];
}

export function InvitationNewPageContent({
  bakeries,
  roles,
}: InvitationNewPageContentProps) {
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
        title="Send Invitation"
        description="Invite a new user to the platform"
        sticky
        breadcrumbs={[
          { label: 'Invitations', href: '/admin/invitations' },
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
                Create Invitation
              </>
            )}
          </button>
        }
      />

      <InvitationForm
        bakeries={bakeries}
        roles={roles}
        onFormRefChange={setFormRef}
        onSavingChange={setIsSaving}
        showBottomActions={false}
      />
    </>
  );
}
