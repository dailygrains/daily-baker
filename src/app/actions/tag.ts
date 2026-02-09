'use server';

import { db } from '@/lib/db';
import { getCurrentUser } from '@/lib/clerk';
import { revalidatePath } from 'next/cache';
import { createActivityLog } from './activity-log';
import {
  createTagTypeSchema,
  updateTagTypeSchema,
  createTagSchema,
  updateTagSchema,
  assignTagSchema,
  unassignTagSchema,
  type CreateTagTypeInput,
  type UpdateTagTypeInput,
  type CreateTagInput,
  type UpdateTagInput,
  type AssignTagInput,
  type UnassignTagInput,
  type EntityType,
} from '@/lib/validations/tag';

// ============================================================================
// Tag Type Actions
// ============================================================================

export async function createTagType(data: CreateTagTypeInput) {
  try {
    const currentUser = await getCurrentUser();

    if (!currentUser) {
      return { success: false, error: 'Unauthorized: You must be logged in' };
    }

    if (currentUser.bakeryId !== data.bakeryId && !currentUser.isPlatformAdmin) {
      return { success: false, error: 'Unauthorized: You can only create tag types for your bakery' };
    }

    const validatedData = createTagTypeSchema.parse(data);

    const tagType = await db.tagType.create({
      data: {
        bakeryId: validatedData.bakeryId,
        name: validatedData.name,
        description: validatedData.description,
        order: validatedData.order ?? 0,
      },
    });

    await createActivityLog({
      userId: currentUser.id!,
      action: 'CREATE',
      entityType: 'tagType',
      entityId: tagType.id,
      entityName: tagType.name,
      description: `Created tag type "${tagType.name}"`,
      metadata: { tagTypeId: tagType.id },
      bakeryId: tagType.bakeryId,
    });

    return { success: true, data: tagType };
  } catch (error) {
    console.error('Error creating tag type:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to create tag type',
    };
  }
}

export async function updateTagType(data: UpdateTagTypeInput) {
  try {
    const currentUser = await getCurrentUser();

    if (!currentUser) {
      return { success: false, error: 'Unauthorized: You must be logged in' };
    }

    const validatedData = updateTagTypeSchema.parse(data);

    const existingTagType = await db.tagType.findUnique({
      where: { id: validatedData.id },
    });

    if (!existingTagType) {
      return { success: false, error: 'Tag type not found' };
    }

    if (currentUser.bakeryId !== existingTagType.bakeryId && !currentUser.isPlatformAdmin) {
      return { success: false, error: 'Unauthorized: You can only update tag types for your bakery' };
    }

    const { id, ...updateData } = validatedData;

    const tagType = await db.tagType.update({
      where: { id },
      data: updateData,
    });

    await createActivityLog({
      userId: currentUser.id!,
      action: 'UPDATE',
      entityType: 'tagType',
      entityId: tagType.id,
      entityName: tagType.name,
      description: `Updated tag type "${tagType.name}"`,
      metadata: { tagTypeId: tagType.id, updatedFields: Object.keys(updateData) },
      bakeryId: tagType.bakeryId,
    });

    return { success: true, data: tagType };
  } catch (error) {
    console.error('Error updating tag type:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to update tag type',
    };
  }
}

export async function deleteTagType(id: string) {
  try {
    const currentUser = await getCurrentUser();

    if (!currentUser) {
      return { success: false, error: 'Unauthorized: You must be logged in' };
    }

    const tagType = await db.tagType.findUnique({
      where: { id },
      include: { _count: { select: { tags: true } } },
    });

    if (!tagType) {
      return { success: false, error: 'Tag type not found' };
    }

    if (currentUser.bakeryId !== tagType.bakeryId && !currentUser.isPlatformAdmin) {
      return { success: false, error: 'Unauthorized: You can only delete tag types for your bakery' };
    }

    if (tagType._count.tags > 0) {
      return {
        success: false,
        error: `Cannot delete tag type with ${tagType._count.tags} tag(s). Remove all tags first.`,
      };
    }

    await db.tagType.delete({ where: { id } });

    await createActivityLog({
      userId: currentUser.id!,
      action: 'DELETE',
      entityType: 'tagType',
      entityId: tagType.id,
      entityName: tagType.name,
      description: `Deleted tag type "${tagType.name}"`,
      metadata: { tagTypeId: tagType.id },
      bakeryId: tagType.bakeryId,
    });

    return { success: true };
  } catch (error) {
    console.error('Error deleting tag type:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to delete tag type',
    };
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

export async function createTag(data: CreateTagInput) {
  try {
    const currentUser = await getCurrentUser();

    if (!currentUser) {
      return { success: false, error: 'Unauthorized: You must be logged in' };
    }

    if (currentUser.bakeryId !== data.bakeryId && !currentUser.isPlatformAdmin) {
      return { success: false, error: 'Unauthorized: You can only create tags for your bakery' };
    }

    const validatedData = createTagSchema.parse(data);

    // Verify tag type exists and belongs to same bakery
    const tagType = await db.tagType.findUnique({
      where: { id: validatedData.tagTypeId },
    });

    if (!tagType) {
      return { success: false, error: 'Tag type not found' };
    }

    if (tagType.bakeryId !== validatedData.bakeryId) {
      return { success: false, error: 'Tag type does not belong to this bakery' };
    }

    const tag = await db.tag.create({
      data: {
        bakeryId: validatedData.bakeryId,
        tagTypeId: validatedData.tagTypeId,
        name: validatedData.name,
        description: validatedData.description,
        color: validatedData.color,
      },
      include: {
        tagType: true,
      },
    });

    await createActivityLog({
      userId: currentUser.id!,
      action: 'CREATE',
      entityType: 'tag',
      entityId: tag.id,
      entityName: tag.name,
      description: `Created tag "${tag.name}" in type "${tag.tagType.name}"`,
      metadata: { tagId: tag.id, tagTypeId: tag.tagTypeId },
      bakeryId: tag.bakeryId,
    });

    return { success: true, data: tag };
  } catch (error) {
    console.error('Error creating tag:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to create tag',
    };
  }
}

export async function updateTag(data: UpdateTagInput) {
  try {
    const currentUser = await getCurrentUser();

    if (!currentUser) {
      return { success: false, error: 'Unauthorized: You must be logged in' };
    }

    const validatedData = updateTagSchema.parse(data);

    const existingTag = await db.tag.findUnique({
      where: { id: validatedData.id },
    });

    if (!existingTag) {
      return { success: false, error: 'Tag not found' };
    }

    if (currentUser.bakeryId !== existingTag.bakeryId && !currentUser.isPlatformAdmin) {
      return { success: false, error: 'Unauthorized: You can only update tags for your bakery' };
    }

    const { id, ...updateData } = validatedData;

    const tag = await db.tag.update({
      where: { id },
      data: updateData,
      include: { tagType: true },
    });

    await createActivityLog({
      userId: currentUser.id!,
      action: 'UPDATE',
      entityType: 'tag',
      entityId: tag.id,
      entityName: tag.name,
      description: `Updated tag "${tag.name}"`,
      metadata: { tagId: tag.id, updatedFields: Object.keys(updateData) },
      bakeryId: tag.bakeryId,
    });

    return { success: true, data: tag };
  } catch (error) {
    console.error('Error updating tag:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to update tag',
    };
  }
}

export async function deleteTag(id: string) {
  try {
    const currentUser = await getCurrentUser();

    if (!currentUser) {
      return { success: false, error: 'Unauthorized: You must be logged in' };
    }

    const tag = await db.tag.findUnique({
      where: { id },
      include: { _count: { select: { entityTags: true } } },
    });

    if (!tag) {
      return { success: false, error: 'Tag not found' };
    }

    if (currentUser.bakeryId !== tag.bakeryId && !currentUser.isPlatformAdmin) {
      return { success: false, error: 'Unauthorized: You can only delete tags for your bakery' };
    }

    await db.tag.delete({ where: { id } });

    await createActivityLog({
      userId: currentUser.id!,
      action: 'DELETE',
      entityType: 'tag',
      entityId: tag.id,
      entityName: tag.name,
      description: `Deleted tag "${tag.name}"`,
      metadata: { tagId: tag.id, entityTagCount: tag._count.entityTags },
      bakeryId: tag.bakeryId,
    });

    return { success: true };
  } catch (error) {
    console.error('Error deleting tag:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to delete tag',
    };
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

export async function assignTagToEntity(data: AssignTagInput) {
  try {
    const currentUser = await getCurrentUser();

    if (!currentUser) {
      return { success: false, error: 'Unauthorized: You must be logged in' };
    }

    const validatedData = assignTagSchema.parse(data);

    // Verify tag exists and user has access
    const tag = await db.tag.findUnique({
      where: { id: validatedData.tagId },
    });

    if (!tag) {
      return { success: false, error: 'Tag not found' };
    }

    if (currentUser.bakeryId !== tag.bakeryId && !currentUser.isPlatformAdmin) {
      return { success: false, error: 'Unauthorized: You can only assign tags for your bakery' };
    }

    // Verify entity exists and belongs to same bakery
    const entityExists = await verifyEntityExists(
      validatedData.entityType,
      validatedData.entityId,
      tag.bakeryId
    );

    if (!entityExists) {
      return { success: false, error: `${validatedData.entityType} not found or does not belong to this bakery` };
    }

    // Check if already assigned
    const existing = await db.entityTag.findUnique({
      where: {
        tagId_entityType_entityId: {
          tagId: validatedData.tagId,
          entityType: validatedData.entityType,
          entityId: validatedData.entityId,
        },
      },
    });

    if (existing) {
      return { success: false, error: 'Tag is already assigned to this entity' };
    }

    const entityTag = await db.entityTag.create({
      data: {
        tagId: validatedData.tagId,
        entityType: validatedData.entityType,
        entityId: validatedData.entityId,
      },
      include: {
        tag: true,
      },
    });

    await createActivityLog({
      userId: currentUser.id!,
      action: 'ASSIGN',
      entityType: validatedData.entityType,
      entityId: validatedData.entityId,
      entityName: tag.name,
      description: `Assigned tag "${tag.name}" to ${validatedData.entityType}`,
      metadata: { tagId: tag.id, entityType: validatedData.entityType, entityId: validatedData.entityId },
      bakeryId: tag.bakeryId,
    });

    revalidatePath(`/dashboard/${validatedData.entityType}s`);
    revalidatePath(`/dashboard/${validatedData.entityType}s/${validatedData.entityId}`);

    return { success: true, data: entityTag };
  } catch (error) {
    console.error('Error assigning tag to entity:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to assign tag',
    };
  }
}

export async function unassignTagFromEntity(data: UnassignTagInput) {
  try {
    const currentUser = await getCurrentUser();

    if (!currentUser) {
      return { success: false, error: 'Unauthorized: You must be logged in' };
    }

    const validatedData = unassignTagSchema.parse(data);

    // Verify tag exists and user has access
    const tag = await db.tag.findUnique({
      where: { id: validatedData.tagId },
    });

    if (!tag) {
      return { success: false, error: 'Tag not found' };
    }

    if (currentUser.bakeryId !== tag.bakeryId && !currentUser.isPlatformAdmin) {
      return { success: false, error: 'Unauthorized: You can only unassign tags for your bakery' };
    }

    // Delete the assignment
    await db.entityTag.delete({
      where: {
        tagId_entityType_entityId: {
          tagId: validatedData.tagId,
          entityType: validatedData.entityType,
          entityId: validatedData.entityId,
        },
      },
    });

    await createActivityLog({
      userId: currentUser.id!,
      action: 'REVOKE',
      entityType: validatedData.entityType,
      entityId: validatedData.entityId,
      entityName: tag.name,
      description: `Removed tag "${tag.name}" from ${validatedData.entityType}`,
      metadata: { tagId: tag.id, entityType: validatedData.entityType, entityId: validatedData.entityId },
      bakeryId: tag.bakeryId,
    });

    revalidatePath(`/dashboard/${validatedData.entityType}s`);
    revalidatePath(`/dashboard/${validatedData.entityType}s/${validatedData.entityId}`);

    return { success: true };
  } catch (error) {
    console.error('Error unassigning tag from entity:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to unassign tag',
    };
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

// ============================================================================
// Helper Functions
// ============================================================================

async function verifyEntityExists(
  entityType: EntityType,
  entityId: string,
  bakeryId: string
): Promise<boolean> {
  switch (entityType) {
    case 'ingredient': {
      const ingredient = await db.ingredient.findUnique({
        where: { id: entityId },
        select: { bakeryId: true },
      });
      return ingredient?.bakeryId === bakeryId;
    }
    case 'recipe': {
      const recipe = await db.recipe.findUnique({
        where: { id: entityId },
        select: { bakeryId: true },
      });
      return recipe?.bakeryId === bakeryId;
    }
    case 'vendor': {
      const vendor = await db.vendor.findUnique({
        where: { id: entityId },
        select: { bakeryId: true },
      });
      return vendor?.bakeryId === bakeryId;
    }
    default:
      return false;
  }
}
