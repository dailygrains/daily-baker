'use client';

import { useState, useRef, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { createTag, updateTag } from '@/app/actions/tag';
import { useFormSubmit } from '@/hooks/useFormSubmit';
import type { Tag, TagType } from '@/generated/prisma';

const TAG_COLORS = [
  { value: '', label: 'None' },
  { value: 'primary', label: 'Primary' },
  { value: 'secondary', label: 'Secondary' },
  { value: 'accent', label: 'Accent' },
  { value: 'success', label: 'Success' },
  { value: 'warning', label: 'Warning' },
  { value: 'error', label: 'Error' },
] as const;

const COLOR_CLASSES: Record<string, string> = {
  primary: 'badge-primary',
  secondary: 'badge-secondary',
  accent: 'badge-accent',
  success: 'badge-success',
  warning: 'badge-warning',
  error: 'badge-error',
};

interface TagFormProps {
  bakeryId: string;
  tagTypes: TagType[];
  tag?: Tag & { tagType: TagType };
  defaultTagTypeId?: string;
  onFormRefChange?: (ref: HTMLFormElement | null) => void;
  onSavingChange?: (isSaving: boolean) => void;
  onUnsavedChangesChange?: (hasChanges: boolean) => void;
  showBottomActions?: boolean;
}

export function TagForm({
  bakeryId,
  tagTypes,
  tag,
  defaultTagTypeId,
  onFormRefChange,
  onSavingChange,
  onUnsavedChangesChange,
  showBottomActions = true,
}: TagFormProps) {
  const router = useRouter();
  const formRef = useRef<HTMLFormElement>(null);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);

  const { submit, isSubmitting, error } = useFormSubmit({
    mode: tag ? 'edit' : 'create',
    entityName: 'Tag',
    listPath: '/dashboard/tags',
    onSuccess: () => setHasUnsavedChanges(false),
  });

  const [formData, setFormData] = useState({
    name: tag?.name ?? '',
    description: tag?.description ?? '',
    tagTypeId: tag?.tagTypeId ?? defaultTagTypeId ?? (tagTypes[0]?.id || ''),
    color: tag?.color ?? '',
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
        tag
          ? updateTag({
              id: tag.id,
              name: formData.name,
              description: formData.description || null,
              color: (formData.color || null) as 'primary' | 'secondary' | 'accent' | 'success' | 'warning' | 'error' | null,
            })
          : createTag({
              bakeryId,
              tagTypeId: formData.tagTypeId,
              name: formData.name,
              description: formData.description || undefined,
              color: formData.color as 'primary' | 'secondary' | 'accent' | 'success' | 'warning' | 'error' | undefined,
            }),
      formData.name
    );
  };

  const updateField = (field: string, value: string) => {
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
          <legend className="fieldset-legend">Tag Type *</legend>
          <select
            className="select select-bordered w-full"
            value={formData.tagTypeId}
            onChange={(e) => updateField('tagTypeId', e.target.value)}
            required
            disabled={!!tag} // Can't change tag type after creation
          >
            {tagTypes.length === 0 ? (
              <option value="">No tag types available</option>
            ) : (
              tagTypes.map((tt) => (
                <option key={tt.id} value={tt.id}>
                  {tt.name}
                </option>
              ))
            )}
          </select>
          {tag && (
            <label className="label">
              <span className="label-text-alt text-warning">
                Tag type cannot be changed after creation
              </span>
            </label>
          )}
        </fieldset>

        <fieldset className="fieldset">
          <legend className="fieldset-legend">Tag Name *</legend>
          <input
            type="text"
            className="input input-bordered w-full"
            value={formData.name}
            onChange={(e) => updateField('name', e.target.value)}
            required
            maxLength={50}
            placeholder="e.g., Organic, Gluten-free, Local"
          />
        </fieldset>

        <fieldset className="fieldset">
          <legend className="fieldset-legend">Description</legend>
          <textarea
            className="textarea textarea-bordered w-full h-24"
            value={formData.description}
            onChange={(e) => updateField('description', e.target.value)}
            maxLength={200}
            placeholder="Describe what this tag means..."
          />
        </fieldset>

        <fieldset className="fieldset">
          <legend className="fieldset-legend">Color</legend>
          <div className="flex flex-wrap gap-3">
            {TAG_COLORS.map((color) => (
              <label key={color.value} className="flex items-center gap-2 cursor-pointer">
                <input
                  type="radio"
                  name="color"
                  className="radio radio-sm"
                  value={color.value}
                  checked={formData.color === color.value}
                  onChange={(e) => updateField('color', e.target.value)}
                />
                {color.value ? (
                  <span className={`badge ${COLOR_CLASSES[color.value]}`}>{color.label}</span>
                ) : (
                  <span className="text-sm">{color.label}</span>
                )}
              </label>
            ))}
          </div>
          <label className="label">
            <span className="label-text-alt">
              Preview: <span className={`badge ${formData.color ? COLOR_CLASSES[formData.color] : 'badge-ghost'}`}>{formData.name || 'Tag Name'}</span>
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
            <button
              type="submit"
              className="btn btn-primary"
              disabled={isSubmitting || tagTypes.length === 0}
            >
              {isSubmitting ? (
                <>
                  <span className="loading loading-spinner loading-sm"></span>
                  {tag ? 'Saving...' : 'Creating...'}
                </>
              ) : (
                tag ? 'Save Changes' : 'Create Tag'
              )}
            </button>
          </div>
        </div>
      )}
    </form>
  );
}
