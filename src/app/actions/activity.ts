'use server';

import { db } from '@/lib/db';
import type { InputJsonObject } from '@prisma/client/runtime/library';

type ActivityLogInput = {
  userId: string;
  action: 'CREATE' | 'UPDATE' | 'DELETE';
  entityType: string;
  entityId: string;
  entityName: string;
  description: string;
  metadata?: Record<string, unknown>;
  bakeryId?: string;
};

/**
 * Create an activity log entry
 */
export async function createActivityLog(data: ActivityLogInput) {
  try {
    await db.activityLog.create({
      data: {
        userId: data.userId,
        action: data.action,
        entityType: data.entityType,
        entityId: data.entityId,
        entityName: data.entityName,
        description: data.description,
        metadata: data.metadata as InputJsonObject | undefined,
        bakeryId: data.bakeryId || null,
      },
    });
  } catch (error) {
    console.error('Failed to create activity log:', error);
    // Don't throw - activity logging should not break the main flow
  }
}

/**
 * Get activity logs for a bakery
 */
export async function getActivityLogsByBakery(
  bakeryId: string,
  limit: number = 50
) {
  try {
    const logs = await db.activityLog.findMany({
      where: { bakeryId },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
      take: limit,
    });

    return { success: true, data: logs };
  } catch (error) {
    console.error('Failed to fetch activity logs:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to fetch activity logs',
    };
  }
}

/**
 * Get activity logs for a specific entity
 */
export async function getActivityLogsByEntity(
  entityType: string,
  entityId: string
) {
  try {
    const logs = await db.activityLog.findMany({
      where: {
        entityType,
        entityId,
      },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    return { success: true, data: logs };
  } catch (error) {
    console.error('Failed to fetch activity logs:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to fetch activity logs',
    };
  }
}
