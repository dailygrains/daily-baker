'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { TagAutocomplete } from './TagAutocomplete';
import { TagBadges } from './TagBadges';
import { assignTagToEntity, unassignTagFromEntity, createTag } from '@/app/actions/tag';
import { useToastStore } from '@/store/toast-store';
import type { EntityType } from '@/lib/validations/tag';

interface Tag {
  id: string;
  name: string;
  color?: string | null;
  tagType?: {
    id: string;
    name: string;
  };
}

interface TagManagerProps {
  bakeryId: string;
  entityType: EntityType;
  entityId: string;
  initialTags: Tag[];
  tagTypeId?: string;
  allowCreate?: boolean;
  defaultTagTypeId?: string;
}

export function TagManager({
  bakeryId,
  entityType,
  entityId,
  initialTags,
  tagTypeId,
  allowCreate = false,
  defaultTagTypeId,
}: TagManagerProps) {
  const router = useRouter();
  const showToast = useToastStore((state) => state.addToast);
  const [tags, setTags] = useState<Tag[]>(initialTags);
  const [isAssigning, setIsAssigning] = useState(false);
  const [isRemoving, setIsRemoving] = useState(false);

  const handleSelectTag = async (tag: Tag) => {
    setIsAssigning(true);
    try {
      const result = await assignTagToEntity({
        tagId: tag.id,
        entityType,
        entityId,
      });

      if (result.success) {
        setTags([...tags, tag]);
        showToast(`Tag "${tag.name}" added`, 'success');
        router.refresh();
      } else {
        showToast(result.error || 'Failed to add tag', 'error');
      }
    } catch (error) {
      showToast(error instanceof Error ? error.message : 'An error occurred', 'error');
    } finally {
      setIsAssigning(false);
    }
  };

  const handleRemoveTag = async (tagId: string) => {
    const tagName = tags.find((t) => t.id === tagId)?.name || 'Tag';
    setIsRemoving(true);
    try {
      const result = await unassignTagFromEntity({
        tagId,
        entityType,
        entityId,
      });

      if (result.success) {
        setTags(tags.filter((t) => t.id !== tagId));
        showToast(`Tag "${tagName}" removed`, 'success');
        router.refresh();
      } else {
        showToast(result.error || 'Failed to remove tag', 'error');
      }
    } catch (error) {
      showToast(error instanceof Error ? error.message : 'An error occurred', 'error');
    } finally {
      setIsRemoving(false);
    }
  };

  const handleCreateTag = async (name: string): Promise<Tag | null> => {
    // Use provided tagTypeId or defaultTagTypeId for creation
    const typeId = tagTypeId || defaultTagTypeId;

    if (!typeId) {
      showToast('Cannot create tag: No tag type specified', 'error');
      return null;
    }

    try {
      const result = await createTag({
        bakeryId,
        tagTypeId: typeId,
        name,
      });

      if (result.success && result.data) {
        showToast(`Tag "${name}" created`, 'success');
        router.refresh();
        return {
          id: result.data.id,
          name: result.data.name,
          color: result.data.color,
          tagType: result.data.tagType,
        };
      } else {
        showToast(result.error || 'Failed to create tag', 'error');
        return null;
      }
    } catch (error) {
      showToast(error instanceof Error ? error.message : 'Failed to create tag', 'error');
      return null;
    }
  };

  return (
    <div className="space-y-3">
      <TagAutocomplete
        bakeryId={bakeryId}
        onSelect={handleSelectTag}
        excludeTagIds={tags.map((t) => t.id)}
        tagTypeId={tagTypeId}
        placeholder="Search and add tags..."
        allowCreate={allowCreate && Boolean(tagTypeId || defaultTagTypeId)}
        onCreate={allowCreate ? handleCreateTag : undefined}
      />

      {tags.length > 0 && (
        <TagBadges
          tags={tags}
          size="md"
          onRemove={handleRemoveTag}
          isRemoving={isRemoving || isAssigning}
        />
      )}
    </div>
  );
}
