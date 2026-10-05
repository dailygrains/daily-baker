'use server';

import { db } from '@/lib/db';
import { getCurrentUser } from '@/lib/clerk';
import { revalidatePath } from 'next/cache';
import { actionContext, actionError, UNAUTHORIZED, type ActionResult } from '@/lib/services/action';
import * as tagService from '@/lib/services/tag';
import type {
  CreateTagTypeInput,
  UpdateTagTypeInput,
  CreateTagInput,
  UpdateTagInput,
  AssignTagInput,
  UnassignTagInput,
  EntityType,
} from '@/lib/validations/tag';

type TagTypeRecord = Awaited<ReturnType<typeof tagService.createTagType>>;
type TagRecord = Awaited<ReturnType<typeof tagService.createTag>>;

// ============================================================================
// Tag Type Actions
// ============================================================================

export async function createTagType(data: CreateTagTypeInput): Promise<ActionResult<TagTypeRecord>> {
  try {
    const ctx = await actionContext();
    if (!ctx) return UNAUTHORIZED;
    if (ctx.bakeryId !== data.bakeryId) {
      return { success: false, error: 'Unauthorized: You can only create tag types for your bakery' };
    }

    const tagType = await tagService.createTagType(ctx, data);
    return { success: true, data: tagType };
  } catch (error) {
    return actionError(error, 'Failed to create tag type');
  }
}

export async function updateTagType(data: UpdateTagTypeInput): Promise<ActionResult<TagTypeRecord>> {
  try {
    const ctx = await actionContext();
    if (!ctx) return UNAUTHORIZED;

    const tagType = await tagService.updateTagType(ctx, data.id, data);
    return { success: true, data: tagType };
  } catch (error) {
    return actionError(error, 'Failed to update tag type');
  }
}

export async function deleteTagType(id: string): Promise<ActionResult> {
  try {
    const ctx = await actionContext();
    if (!ctx) return UNAUTHORIZED;

    await tagService.deleteTagType(ctx, id);
    return { success: true };
  } catch (error) {
    return actionError(error, 'Failed to delete tag type');
  }
}

export async function getTagTypesByBakery(bakeryId: string) {
  try {
    const currentUser = await getCurrentUser();

    if (!currentUser) {
      return { success: false, error: 'Unauthorized' };
    }

    if (currentUser.bakeryId !== bakeryId && !currentUser.isPlatformAdmin) {
      return { success: false, error: 'Unauthorized: You can only view tag types for your bakery' };
    }

    const tagTypes = await db.tagType.findMany({
      where: { bakeryId },
      include: {
        tags: {
          orderBy: { name: 'asc' },
        },
        _count: { select: { tags: true } },
      },
      orderBy: [{ order: 'asc' }, { name: 'asc' }],
    });

    return { success: true, data: tagTypes };
  } catch (error) {
    console.error('Error fetching tag types:', error);
    return { success: false, error: 'Failed to fetch tag types' };
  }
}

export async function getTagTypeById(id: string) {
  try {
    const currentUser = await getCurrentUser();

    if (!currentUser) {
      return { success: false, error: 'Unauthorized' };
    }

    const tagType = await db.tagType.findUnique({
      where: { id },
      include: {
        tags: {
          include: {
            _count: { select: { entityTags: true } },
          },
          orderBy: { name: 'asc' },
        },
        _count: { select: { tags: true } },
      },
    });

    if (!tagType) {
      return { success: false, error: 'Tag type not found' };
    }

    if (currentUser.bakeryId !== tagType.bakeryId && !currentUser.isPlatformAdmin) {
      return { success: false, error: 'Unauthorized: You can only view tag types for your bakery' };
    }

    return { success: true, data: tagType };
  } catch (error) {
    console.error('Error fetching tag type:', error);
    return { success: false, error: 'Failed to fetch tag type' };
  }
}

// ============================================================================
// Tag Actions
// ============================================================================

export async function createTag(data: CreateTagInput): Promise<ActionResult<TagRecord>> {
  try {
    const ctx = await actionContext();
    if (!ctx) return UNAUTHORIZED;
    if (ctx.bakeryId !== data.bakeryId) {
      return { success: false, error: 'Unauthorized: You can only create tags for your bakery' };
    }

    const tag = await tagService.createTag(ctx, data);
    return { success: true, data: tag };
  } catch (error) {
    return actionError(error, 'Failed to create tag');
  }
}

export async function updateTag(data: UpdateTagInput): Promise<ActionResult<TagRecord>> {
  try {
    const ctx = await actionContext();
    if (!ctx) return UNAUTHORIZED;

    const tag = await tagService.updateTag(ctx, data.id, data);
    return { success: true, data: tag };
  } catch (error) {
    return actionError(error, 'Failed to update tag');
  }
}

export async function deleteTag(id: string): Promise<ActionResult> {
  try {
    const ctx = await actionContext();
    if (!ctx) return UNAUTHORIZED;

    await tagService.deleteTag(ctx, id);
    return { success: true };
  } catch (error) {
    return actionError(error, 'Failed to delete tag');
  }
}

export async function getTagsByBakery(bakeryId: string) {
  try {
    const currentUser = await getCurrentUser();

    if (!currentUser) {
      return { success: false, error: 'Unauthorized' };
    }

    if (currentUser.bakeryId !== bakeryId && !currentUser.isPlatformAdmin) {
      return { success: false, error: 'Unauthorized: You can only view tags for your bakery' };
    }

    const tags = await db.tag.findMany({
      where: { bakeryId },
      include: {
        tagType: true,
        _count: { select: { entityTags: true } },
      },
      orderBy: [{ tagType: { order: 'asc' } }, { name: 'asc' }],
    });

    return { success: true, data: tags };
  } catch (error) {
    console.error('Error fetching tags:', error);
    return { success: false, error: 'Failed to fetch tags' };
  }
}

export async function getTagById(id: string) {
  try {
    const currentUser = await getCurrentUser();

    if (!currentUser) {
      return { success: false, error: 'Unauthorized' };
    }

    const tag = await db.tag.findUnique({
      where: { id },
      include: {
        tagType: true,
        _count: { select: { entityTags: true } },
        entityTags: {
          take: 50,
          orderBy: { createdAt: 'desc' },
        },
      },
    });

    if (!tag) {
      return { success: false, error: 'Tag not found' };
    }

    if (currentUser.bakeryId !== tag.bakeryId && !currentUser.isPlatformAdmin) {
      return { success: false, error: 'Unauthorized: You can only view tags for your bakery' };
    }

    return { success: true, data: tag };
  } catch (error) {
    console.error('Error fetching tag:', error);
    return { success: false, error: 'Failed to fetch tag' };
  }
}

export async function searchTags(
  bakeryId: string,
  search: string,
  options?: {
    tagTypeId?: string;
    excludeTagIds?: string[];
    limit?: number;
  }
) {
  try {
    const currentUser = await getCurrentUser();

    if (!currentUser) {
      return { success: false, error: 'Unauthorized' };
    }

    if (currentUser.bakeryId !== bakeryId && !currentUser.isPlatformAdmin) {
      return { success: false, error: 'Unauthorized' };
    }

    const tags = await db.tag.findMany({
      where: {
        bakeryId,
        ...(search && {
          name: { contains: search, mode: 'insensitive' },
        }),
        ...(options?.tagTypeId && { tagTypeId: options.tagTypeId }),
        ...(options?.excludeTagIds?.length && {
          id: { notIn: options.excludeTagIds },
        }),
      },
      include: {
        tagType: true,
      },
      take: options?.limit ?? 10,
      orderBy: [{ tagType: { order: 'asc' } }, { name: 'asc' }],
    });

    return { success: true, data: tags };
  } catch (error) {
    console.error('Error searching tags:', error);
    return { success: false, error: 'Failed to search tags' };
  }
}

// ============================================================================
// Entity Tag Actions
// ============================================================================

export async function assignTagToEntity(
  data: AssignTagInput
): Promise<ActionResult<Awaited<ReturnType<typeof tagService.assignTag>>>> {
  try {
    const ctx = await actionContext();
    if (!ctx) return UNAUTHORIZED;

    const entityTag = await tagService.assignTag(ctx, data.tagId, data);

    revalidatePath(`/dashboard/${data.entityType}s`);
    revalidatePath(`/dashboard/${data.entityType}s/${data.entityId}`);
    return { success: true, data: entityTag };
  } catch (error) {
    return actionError(error, 'Failed to assign tag');
  }
}

export async function unassignTagFromEntity(data: UnassignTagInput): Promise<ActionResult> {
  try {
    const ctx = await actionContext();
    if (!ctx) return UNAUTHORIZED;

    await tagService.unassignTag(ctx, data.tagId, data);

    revalidatePath(`/dashboard/${data.entityType}s`);
    revalidatePath(`/dashboard/${data.entityType}s/${data.entityId}`);
    return { success: true };
  } catch (error) {
    return actionError(error, 'Failed to unassign tag');
  }
}

export async function getTagsForEntity(entityType: EntityType, entityId: string) {
  try {
    const currentUser = await getCurrentUser();

    if (!currentUser) {
      return { success: false, error: 'Unauthorized' };
    }

    const entityTags = await db.entityTag.findMany({
      where: {
        entityType,
        entityId,
      },
      include: {
        tag: {
          include: {
            tagType: true,
          },
        },
      },
      orderBy: {
        tag: { name: 'asc' },
      },
    });

    // Verify user has access to these tags
    if (entityTags.length > 0) {
      const bakeryId = entityTags[0].tag.bakeryId;
      if (currentUser.bakeryId !== bakeryId && !currentUser.isPlatformAdmin) {
        return { success: false, error: 'Unauthorized' };
      }
    }

    return {
      success: true,
      data: entityTags.map((et) => et.tag),
    };
  } catch (error) {
    console.error('Error fetching tags for entity:', error);
    return { success: false, error: 'Failed to fetch tags' };
  }
}
