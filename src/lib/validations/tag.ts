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

// Hex color validation (accepts #RGB, #RRGGBB formats)
const hexColorSchema = z.string().regex(/^#([0-9A-Fa-f]{3}|[0-9A-Fa-f]{6})$/, 'Invalid hex color');

export const createTagSchema = z.object({
  bakeryId: z.string().cuid(),
  tagTypeId: z.string().cuid(),
  name: z.string().min(1, 'Tag name is required').max(50),
  description: z.string().max(200).optional(),
  color: hexColorSchema.optional(),
});

export const updateTagSchema = z.object({
  id: z.string().cuid(),
  name: z.string().min(1, 'Tag name is required').max(50).optional(),
  description: z.string().max(200).nullable().optional(),
  color: hexColorSchema.nullable().optional(),
});

export type CreateTagInput = z.infer<typeof createTagSchema>;
export type UpdateTagInput = z.infer<typeof updateTagSchema>;

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
