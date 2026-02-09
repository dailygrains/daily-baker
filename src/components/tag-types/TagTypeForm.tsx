'use client';

import { useState, useRef, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { createTagType, updateTagType } from '@/app/actions/tag';
import { useFormSubmit } from '@/hooks/useFormSubmit';
import type { TagType } from '@/generated/prisma';

interface TagTypeFormProps {
  bakeryId: string;
  tagType?: TagType;
  onFormRefChange?: (ref: HTMLFormElement | null) => void;
  onSavingChange?: (isSaving: boolean) => void;
  onUnsavedChangesChange?: (hasChanges: boolean) => void;
  showBottomActions?: boolean;
}

export function TagTypeForm({
  bakeryId,
  tagType,
  onFormRefChange,
  onSavingChange,
  onUnsavedChangesChange,
  showBottomActions = true,
}: TagTypeFormProps) {
  const router = useRouter();
  const formRef = useRef<HTMLFormElement>(null);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);

  const { submit, isSubmitting, error } = useFormSubmit({
    mode: tagType ? 'edit' : 'create',
    entityName: 'Tag Type',
    listPath: '/dashboard/tag-types',
    onSuccess: () => setHasUnsavedChanges(false),
  });

  const [formData, setFormData] = useState({
    name: tagType?.name ?? '',
    description: tagType?.description ?? '',
    order: tagType?.order ?? 0,
  });

  // Notify parent of form ref changes
  useEffect(() => {
    if (onFormRefChange && formRef.current) {
      onFormRefChange(formRef.current);
    }
  }, [onFormRefChange]);

  // Notify parent of saving state changes
  useEffect(() => {
    if (onSavingChange) {
      onSavingChange(isSubmitting);
    }
  }, [isSubmitting, onSavingChange]);

  // Notify parent of unsaved changes state
  useEffect(() => {
    if (onUnsavedChangesChange) {
      onUnsavedChangesChange(hasUnsavedChanges);
    }
  }, [hasUnsavedChanges, onUnsavedChangesChange]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    await submit(
      () =>
        tagType
          ? updateTagType({
              id: tagType.id,
              name: formData.name,
              description: formData.description || null,
              order: formData.order,
            })
          : createTagType({
              bakeryId,
              name: formData.name,
              description: formData.description || undefined,
              order: formData.order,
            }),
      formData.name
    );
  };

  const updateField = (field: string, value: string | number) => {
    setFormData({ ...formData, [field]: value });
    setHasUnsavedChanges(true);
  };

  return (
    <form ref={formRef} onSubmit={handleSubmit} className="space-y-8">
      {error && (
        <div className="alert alert-error">
          <svg xmlns="http://www.w3.org/2000/svg" className="stroke-current shrink-0 h-6 w-6" fill="none" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <span>{error}</span>
        </div>
      )}

      <div className="space-y-0">
        <h2 className="text-xl font-semibold">Basic Information</h2>

        <fieldset className="fieldset">
          <legend className="fieldset-legend">Tag Type Name *</legend>
          <input
            type="text"
            className="input input-bordered w-full"
            value={formData.name}
            onChange={(e) => updateField('name', e.target.value)}
            required
            maxLength={50}
            placeholder="e.g., Dietary, Source, Allergen"
          />
          <label className="label">
            <span className="label-text-alt">
              A category for grouping related tags
            </span>
          </label>
        </fieldset>

        <fieldset className="fieldset">
          <legend className="fieldset-legend">Description</legend>
          <textarea
            className="textarea textarea-bordered w-full h-24"
            value={formData.description}
            onChange={(e) => updateField('description', e.target.value)}
            maxLength={200}
            placeholder="Describe what this tag type is used for..."
          />
          <label className="label">
            <span className="label-text-alt">
              Optional description for this tag type
            </span>
          </label>
        </fieldset>

        <fieldset className="fieldset">
          <legend className="fieldset-legend">Display Order</legend>
          <input
            type="number"
            className="input input-bordered w-32"
            value={formData.order}
            onChange={(e) => updateField('order', parseInt(e.target.value) || 0)}
            min={0}
          />
          <label className="label">
            <span className="label-text-alt">
              Lower numbers appear first in lists
            </span>
          </label>
        </fieldset>
      </div>

      {showBottomActions && (
        <div className="flex gap-3 justify-between pt-4">
          <div className="flex gap-3 ml-auto">
            <button
              type="button"
              className="btn btn-ghost"
              onClick={() => router.back()}
              disabled={isSubmitting}
            >
              Cancel
            </button>
            <button type="submit" className="btn btn-primary" disabled={isSubmitting}>
              {isSubmitting ? (
                <>
                  <span className="loading loading-spinner loading-sm"></span>
                  {tagType ? 'Saving...' : 'Creating...'}
                </>
              ) : (
                tagType ? 'Save Changes' : 'Create Tag Type'
              )}
            </button>
          </div>
        </div>
      )}
    </form>
  );
}
