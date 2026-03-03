'use client';

import { useRef, useEffect } from 'react';
import { createInvitation } from '@/app/actions/invitation';
import { useFormSubmit } from '@/hooks/useFormSubmit';
import type { Bakery, Role } from '@/generated/prisma';

interface InvitationFormProps {
  bakeries: Bakery[];
  roles: Role[];
  onFormRefChange?: (ref: HTMLFormElement | null) => void;
  onSavingChange?: (isSaving: boolean) => void;
  showBottomActions?: boolean;
}

export function InvitationForm({
  bakeries,
  roles,
  onFormRefChange,
  onSavingChange,
  showBottomActions = true,
}: InvitationFormProps) {
  const formRef = useRef<HTMLFormElement>(null);

  const { submit, isSubmitting, error } = useFormSubmit({
    mode: 'create',
    entityName: 'Invitation',
    listPath: '/admin/invitations',
  });

  useEffect(() => {
    if (onFormRefChange && formRef.current) {
      onFormRefChange(formRef.current);
    }
  }, [onFormRefChange]);

  useEffect(() => {
    if (onSavingChange) {
      onSavingChange(isSubmitting);
    }
  }, [isSubmitting, onSavingChange]);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();

    const formData = new FormData(e.currentTarget);
    const email = formData.get('email') as string;
    const bakeryId = formData.get('bakeryId') as string;
    const roleId = formData.get('roleId') as string;

    await submit(
      () =>
        createInvitation({
          email,
          bakeryId: bakeryId || null,
          roleId: roleId || null,
        }),
      email
    );
  }

  return (
    <form ref={formRef} onSubmit={handleSubmit} className="space-y-8">
      <div className="space-y-0">
        <h2 className="text-xl font-semibold">Invitation Details</h2>

        <fieldset className="fieldset">
          <legend className="fieldset-legend">Email Address *</legend>
          <input
            type="email"
            name="email"
            className="input input-bordered w-full"
            required
            placeholder="user@example.com"
          />
          <label className="label">
            <span className="label-text-alt">The user will receive an invitation at this email</span>
          </label>
        </fieldset>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6">
          <fieldset className="fieldset">
            <legend className="fieldset-legend">Bakery *</legend>
            <select
              name="bakeryId"
              className="select select-bordered w-full"
              required
            >
              <option value="">Select a bakery</option>
              {bakeries.map((bakery) => (
                <option key={bakery.id} value={bakery.id}>
                  {bakery.name}
                </option>
              ))}
            </select>
            <label className="label">
              <span className="label-text-alt">The user will be added to this bakery</span>
            </label>
          </fieldset>

          <fieldset className="fieldset">
            <legend className="fieldset-legend">Role *</legend>
            <select
              name="roleId"
              className="select select-bordered w-full"
              required
            >
              <option value="">Select a role</option>
              {roles.map((role) => (
                <option key={role.id} value={role.id}>
                  {role.name}
                </option>
              ))}
            </select>
            <label className="label">
              <span className="label-text-alt">The user will be assigned this role</span>
            </label>
          </fieldset>
        </div>
      </div>

      <div className="alert alert-soft text-sm text-base-content/60">
        Invitations are valid for 7 days. After creating one, you&apos;ll be able to copy the invitation link to share.
      </div>

      {showBottomActions && (
        <div className="flex gap-3 justify-between pt-4">
          <div className="flex gap-3 ml-auto">
            <button
              type="submit"
              className="btn btn-primary"
              disabled={isSubmitting}
            >
              {isSubmitting ? (
                <>
                  <span className="loading loading-spinner loading-sm"></span>
                  Creating...
                </>
              ) : (
                'Create Invitation'
              )}
            </button>
          </div>
        </div>
      )}
    </form>
  );
}
