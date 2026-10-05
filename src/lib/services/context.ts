import type { InputJsonObject } from '@prisma/client/runtime/library';
import type { ActivityType } from '@/generated/prisma';
import { db } from '@/lib/db';

/**
 * Who is acting. Built from the Clerk user in server actions, or from the
 * resolved API auth in REST routes, so both paths run the same service code.
 */
export interface ServiceContext {
  bakeryId: string | null;
  /** Null for API-key callers: keys are not tied to a user yet. */
  userId: string | null;
  isPlatformAdmin: boolean;
}

export type ServiceErrorStatus = 400 | 403 | 404 | 409 | 422;

/** An expected failure with a message safe to show the caller. */
export class ServiceError extends Error {
  constructor(
    public status: ServiceErrorStatus,
    message: string,
    public details?: unknown
  ) {
    super(message);
    this.name = 'ServiceError';
  }
}

export const notFound = (entity: string) => new ServiceError(404, `${entity} not found`);

export function requireBakery(ctx: ServiceContext): string {
  if (!ctx.bakeryId) {
    throw new ServiceError(403, 'No bakery is associated with this account');
  }
  return ctx.bakeryId;
}

export function requirePlatformAdmin(ctx: ServiceContext) {
  if (!ctx.isPlatformAdmin) {
    throw new ServiceError(403, 'Only platform administrators can do this');
  }
}

type BakeryOwnedModel =
  | 'ingredient'
  | 'recipe'
  | 'supply'
  | 'vendor'
  | 'tag'
  | 'tagType'
  | 'equipment'
  | 'productionSheet'
  | 'product';

/**
 * Throw a 422 unless every id refers to a row of `model` owned by the bakery.
 * Used to stop request bodies from referencing another tenant's records.
 */
export async function assertAllOwned(
  model: BakeryOwnedModel,
  ids: Iterable<string | null | undefined>,
  bakeryId: string,
  label: string
) {
  const unique = [...new Set([...ids].filter((id): id is string => Boolean(id)))];
  if (unique.length === 0) return;

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const count = await (db as any)[model].count({ where: { id: { in: unique }, bakeryId } });
  if (count !== unique.length) {
    throw new ServiceError(422, `${label} not found or belongs to another bakery`);
  }
}

/**
 * Record an activity log entry. Skipped for API-key callers, since
 * ActivityLog requires a user. Never throws: logging must not fail a write.
 */
export async function logActivity(
  ctx: ServiceContext,
  entry: {
    action: ActivityType;
    entityType: string;
    entityId: string;
    entityName: string;
    description: string;
    metadata?: Record<string, unknown>;
    bakeryId?: string | null;
  }
) {
  if (!ctx.userId) return;
  try {
    await db.activityLog.create({
      data: {
        userId: ctx.userId,
        // An explicit null means a platform-level event with no bakery; only
        // an omitted bakeryId falls back to the caller's bakery.
        bakeryId: 'bakeryId' in entry ? (entry.bakeryId ?? null) : ctx.bakeryId,
        action: entry.action,
        entityType: entry.entityType,
        entityId: entry.entityId,
        entityName: entry.entityName,
        description: entry.description,
        metadata: entry.metadata as InputJsonObject | undefined,
      },
    });
  } catch (error) {
    console.error('Failed to create activity log:', error);
  }
}
