import { db } from '@/lib/db';
import {
  createTagTypeSchema,
  updateTagTypeSchema,
  createTagSchema,
  updateTagSchema,
  assignTagSchema,
  unassignTagSchema,
  type EntityType,
} from '@/lib/validations/tag';
import {
  ServiceError,
  assertAllOwned,
  logActivity,
  notFound,
  requireBakery,
  type ServiceContext,
} from './context';

const entityTypeSchema = assignTagSchema.shape.entityType;

/** Turn a unique-constraint violation into a 409 with a readable message. */
async function uniqueOr409<T>(write: Promise<T>, message: string): Promise<T> {
  try {
    return await write;
  } catch (error) {
    if ((error as { code?: string })?.code === 'P2002') {
      throw new ServiceError(409, message);
    }
    throw error;
  }
}

// ============================================================================
// Tag types
// ============================================================================

export async function createTagType(ctx: ServiceContext, input: unknown) {
  const bakeryId = requireBakery(ctx);
  const data = createTagTypeSchema.parse({ ...(input as object), bakeryId });

  const tagType = await uniqueOr409(
    db.tagType.create({
      data: {
        bakeryId,
        name: data.name,
        description: data.description,
        order: data.order ?? 0,
      },
    }),
    `A tag type named "${data.name}" already exists`
  );

  await logActivity(ctx, {
    action: 'CREATE',
    entityType: 'tagType',
    entityId: tagType.id,
    entityName: tagType.name,
    description: `Created tag type "${tagType.name}"`,
    metadata: { tagTypeId: tagType.id },
  });

  return tagType;
}

export async function updateTagType(ctx: ServiceContext, id: string, input: unknown) {
  const bakeryId = requireBakery(ctx);
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const { id: _id, ...updateData } = updateTagTypeSchema.parse({ ...(input as object), id });

  const existing = await db.tagType.findFirst({ where: { id, bakeryId }, select: { id: true } });
  if (!existing) throw notFound('Tag type');

  const tagType = await uniqueOr409(
    db.tagType.update({ where: { id }, data: updateData }),
    `A tag type named "${updateData.name}" already exists`
  );

  await logActivity(ctx, {
    action: 'UPDATE',
    entityType: 'tagType',
    entityId: tagType.id,
    entityName: tagType.name,
    description: `Updated tag type "${tagType.name}"`,
    metadata: { tagTypeId: tagType.id, updatedFields: Object.keys(updateData) },
  });

  return tagType;
}

export async function deleteTagType(ctx: ServiceContext, id: string) {
  const bakeryId = requireBakery(ctx);
  const tagType = await db.tagType.findFirst({
    where: { id, bakeryId },
    include: { _count: { select: { tags: true } } },
  });
  if (!tagType) throw notFound('Tag type');

  // Deleting would cascade to every tag of this type and their assignments.
  if (tagType._count.tags > 0) {
    throw new ServiceError(
      409,
      `Cannot delete tag type with ${tagType._count.tags} tag(s). Remove all tags first.`
    );
  }

  await db.tagType.delete({ where: { id } });

  await logActivity(ctx, {
    action: 'DELETE',
    entityType: 'tagType',
    entityId: tagType.id,
    entityName: tagType.name,
    description: `Deleted tag type "${tagType.name}"`,
    metadata: { tagTypeId: tagType.id },
  });

  return tagType;
}

// ============================================================================
// Tags
// ============================================================================

export async function createTag(ctx: ServiceContext, input: unknown) {
  const bakeryId = requireBakery(ctx);
  const data = createTagSchema.parse({ ...(input as object), bakeryId });

  await assertAllOwned('tagType', [data.tagTypeId], bakeryId, 'Tag type');

  const tag = await uniqueOr409(
    db.tag.create({
      data: {
        bakeryId,
        tagTypeId: data.tagTypeId,
        name: data.name,
        description: data.description,
        color: data.color,
      },
      include: { tagType: true },
    }),
    `A tag named "${data.name}" already exists in this tag type`
  );

  await logActivity(ctx, {
    action: 'CREATE',
    entityType: 'tag',
    entityId: tag.id,
    entityName: tag.name,
    description: `Created tag "${tag.name}" in type "${tag.tagType.name}"`,
    metadata: { tagId: tag.id, tagTypeId: tag.tagTypeId },
  });

  return tag;
}

/** The tag type is fixed at creation; updateTagSchema has no tagTypeId. */
export async function updateTag(ctx: ServiceContext, id: string, input: unknown) {
  const bakeryId = requireBakery(ctx);
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const { id: _id, ...updateData } = updateTagSchema.parse({ ...(input as object), id });

  const existing = await db.tag.findFirst({ where: { id, bakeryId }, select: { id: true } });
  if (!existing) throw notFound('Tag');

  const tag = await uniqueOr409(
    db.tag.update({ where: { id }, data: updateData, include: { tagType: true } }),
    `A tag named "${updateData.name}" already exists in this tag type`
  );

  await logActivity(ctx, {
    action: 'UPDATE',
    entityType: 'tag',
    entityId: tag.id,
    entityName: tag.name,
    description: `Updated tag "${tag.name}"`,
    metadata: { tagId: tag.id, updatedFields: Object.keys(updateData) },
  });

  return tag;
}

/** Removes the tag and, as the dashboard does, all of its assignments. */
export async function deleteTag(ctx: ServiceContext, id: string) {
  const bakeryId = requireBakery(ctx);
  const tag = await db.tag.findFirst({
    where: { id, bakeryId },
    include: { _count: { select: { entityTags: true } } },
  });
  if (!tag) throw notFound('Tag');

  await db.tag.delete({ where: { id } });

  await logActivity(ctx, {
    action: 'DELETE',
    entityType: 'tag',
    entityId: tag.id,
    entityName: tag.name,
    description: `Deleted tag "${tag.name}"`,
    metadata: { tagId: tag.id, entityTagCount: tag._count.entityTags },
  });

  return tag;
}

// ============================================================================
// Entity tag assignments
// ============================================================================

const ENTITY_MODELS = {
  ingredient: 'ingredient',
  recipe: 'recipe',
  vendor: 'vendor',
} as const satisfies Record<EntityType, string>;

const ENTITY_LABELS: Record<EntityType, string> = {
  ingredient: 'Ingredient',
  recipe: 'Recipe',
  vendor: 'Vendor',
};

async function requireTag(tagId: string, bakeryId: string) {
  const tag = await db.tag.findFirst({ where: { id: tagId, bakeryId } });
  if (!tag) throw notFound('Tag');
  return tag;
}

export async function assignTag(ctx: ServiceContext, tagId: string, input: unknown) {
  const bakeryId = requireBakery(ctx);
  const data = assignTagSchema.parse({ ...(input as object), tagId });

  const tag = await requireTag(tagId, bakeryId);
  await assertAllOwned(
    ENTITY_MODELS[data.entityType],
    [data.entityId],
    bakeryId,
    ENTITY_LABELS[data.entityType]
  );

  const entityTag = await uniqueOr409(
    db.entityTag.create({
      data: { tagId, entityType: data.entityType, entityId: data.entityId },
      include: { tag: true },
    }),
    'Tag is already assigned to this entity'
  );

  await logActivity(ctx, {
    action: 'ASSIGN',
    entityType: data.entityType,
    entityId: data.entityId,
    entityName: tag.name,
    description: `Assigned tag "${tag.name}" to ${data.entityType}`,
    metadata: { tagId: tag.id, entityType: data.entityType, entityId: data.entityId },
  });

  return entityTag;
}

export async function unassignTag(ctx: ServiceContext, tagId: string, input: unknown) {
  const bakeryId = requireBakery(ctx);
  const data = unassignTagSchema.parse({ ...(input as object), tagId });

  const tag = await requireTag(tagId, bakeryId);

  const { count } = await db.entityTag.deleteMany({
    where: { tagId, entityType: data.entityType, entityId: data.entityId },
  });
  if (count === 0) throw notFound('Tag assignment');

  await logActivity(ctx, {
    action: 'REVOKE',
    entityType: data.entityType,
    entityId: data.entityId,
    entityName: tag.name,
    description: `Removed tag "${tag.name}" from ${data.entityType}`,
    metadata: { tagId: tag.id, entityType: data.entityType, entityId: data.entityId },
  });

  return { tagId, entityType: data.entityType, entityId: data.entityId };
}

/** Every assignment of one tag. */
export async function listTagAssignments(ctx: ServiceContext, tagId: string) {
  const bakeryId = requireBakery(ctx);
  await requireTag(tagId, bakeryId);
  return db.entityTag.findMany({ where: { tagId }, orderBy: { createdAt: 'desc' } });
}

/** The tags assigned to one ingredient, recipe or vendor. */
export async function listTagsForEntity(ctx: ServiceContext, entityType: unknown, entityId: string) {
  const bakeryId = requireBakery(ctx);
  const type = entityTypeSchema.parse(entityType);

  // A path naming another bakery's entity reads as missing, not invalid.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const owned = await (db as any)[ENTITY_MODELS[type]].count({ where: { id: entityId, bakeryId } });
  if (!owned) throw notFound(ENTITY_LABELS[type]);

  const entityTags = await db.entityTag.findMany({
    where: { entityType: type, entityId, tag: { bakeryId } },
    include: { tag: { include: { tagType: true } } },
    orderBy: { tag: { name: 'asc' } },
  });
  return entityTags.map((et) => et.tag);
}
