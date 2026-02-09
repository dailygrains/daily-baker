'use client';

import { useState, useRef, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { createTag, updateTag } from '@/app/actions/tag';
import { useFormSubmit } from '@/hooks/useFormSubmit';
import type { Tag, TagType } from '@/generated/prisma';

// Helper to determine if text should be light or dark based on background color
function getContrastColor(hexColor: string): string {
  const hex = hexColor.replace('#', '');
  const r = parseInt(hex.substring(0, 2), 16);
  const g = parseInt(hex.substring(2, 4), 16);
  const b = parseInt(hex.substring(4, 6), 16);
  const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
  return luminance > 0.5 ? '#000000' : '#ffffff';
}

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
    color: tag?.color ?? '#6366f1', // Default to a nice indigo
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
              color: formData.color,
            })
          : createTag({
              bakeryId,
              tagTypeId: formData.tagTypeId,
              name: formData.name,
              description: formData.description || undefined,
              color: formData.color,
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
          <div className="flex items-center gap-3">
            <input
              type="color"
              className="w-12 h-12 rounded-lg cursor-pointer border-2 border-base-300 p-1"
              value={formData.color}
              onChange={(e) => updateField('color', e.target.value)}
            />
            <input
              type="text"
              className="input input-bordered w-32 font-mono"
              value={formData.color}
              onChange={(e) => {
                const value = e.target.value;
                if (value.match(/^#[0-9A-Fa-f]{0,6}$/)) {
                  updateField('color', value);
                }
              }}
              placeholder="#000000"
            />
          </div>
          <label className="label">
            <span className="label-text-alt flex items-center gap-2">
              Preview:{' '}
              <span
                className="badge"
                style={{
                  backgroundColor: formData.color,
                  color: getContrastColor(formData.color.length === 7 ? formData.color : '#6366f1'),
                }}
              >
                {formData.name || 'Tag Name'}
              </span>
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
