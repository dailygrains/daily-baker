import { z } from 'zod';

// ============================================================================
// Tag Type Schemas
// ============================================================================

export const createTagTypeSchema = z.object({
  bakeryId: z.string().cuid(),
  name: z.string().min(1, 'Tag type name is required').max(50),
  description: z.string().max(200).optional(),
  order: z.number().int().min(0).optional(),
});

export const updateTagTypeSchema = z.object({
  id: z.string().cuid(),
  name: z.string().min(1, 'Tag type name is required').max(50).optional(),
  description: z.string().max(200).nullable().optional(),
  order: z.number().int().min(0).optional(),
});

export type CreateTagTypeInput = z.infer<typeof createTagTypeSchema>;
export type UpdateTagTypeInput = z.infer<typeof updateTagTypeSchema>;

// ============================================================================
// Tag Schemas
// ============================================================================

const TAG_COLORS = ['primary', 'secondary', 'accent', 'success', 'warning', 'error'] as const;

export const createTagSchema = z.object({
  bakeryId: z.string().cuid(),
  tagTypeId: z.string().cuid(),
  name: z.string().min(1, 'Tag name is required').max(50),
  description: z.string().max(200).optional(),
  color: z.enum(TAG_COLORS).optional(),
});

export const updateTagSchema = z.object({
  id: z.string().cuid(),
  name: z.string().min(1, 'Tag name is required').max(50).optional(),
  description: z.string().max(200).nullable().optional(),
  color: z.enum(TAG_COLORS).nullable().optional(),
});

export type CreateTagInput = z.infer<typeof createTagSchema>;
export type UpdateTagInput = z.infer<typeof updateTagSchema>;
export type TagColor = (typeof TAG_COLORS)[number];

// ============================================================================
// Entity Tag Schemas
// ============================================================================

const ENTITY_TYPES = ['ingredient', 'recipe', 'vendor'] as const;

export const assignTagSchema = z.object({
  tagId: z.string().cuid(),
  entityType: z.enum(ENTITY_TYPES),
  entityId: z.string().cuid(),
});

export const unassignTagSchema = z.object({
  tagId: z.string().cuid(),
  entityType: z.enum(ENTITY_TYPES),
  entityId: z.string().cuid(),
});

export type AssignTagInput = z.infer<typeof assignTagSchema>;
export type UnassignTagInput = z.infer<typeof unassignTagSchema>;
export type EntityType = (typeof ENTITY_TYPES)[number];
