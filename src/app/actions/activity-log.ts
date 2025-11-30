'use server';

import { db } from '@/lib/db';
import { getCurrentUser } from '@/lib/clerk';
import { ActivityType } from '@/generated/prisma';
import type { InputJsonObject } from '@prisma/client/runtime/library';

/**
 * Helper function to create an activity log entry
 * Can be called from other server actions to log activities
 */
export async function createActivityLog(data: {
  userId: string;
  action: ActivityType;
  entityType: string;
  entityId?: string | null;
  entityName?: string | null;
  description: string;
  metadata?: Record<string, unknown>;
  bakeryId?: string | null;
}) {
  try {
    const activityLog = await db.activityLog.create({
      data: {
        userId: data.userId,
        bakeryId: data.bakeryId || null,
        action: data.action,
        entityType: data.entityType,
        entityId: data.entityId || null,
        entityName: data.entityName || null,
        description: data.description,
        metadata: data.metadata as InputJsonObject | undefined,
      },
    });

    return { success: true, data: activityLog };
  } catch (error) {
    console.error('Failed to create activity log:', error);
    return { success: false, error: 'Failed to create activity log' };
  }
}

/**
 * Get activity logs with filtering
 * Platform admins see all logs, bakery users see only their bakery's logs
 */
export async function getActivityLogs(options?: {
  bakeryId?: string;
  userId?: string;
  action?: ActivityType;
  entityType?: string;
  limit?: number;
  offset?: number;
}) {
  try {
    const user = await getCurrentUser();

    if (!user) {
      return { success: false, error: 'Unauthorized' };
    }

    // Build filter conditions
    const where: {
      bakeryId?: string | null;
      userId?: string;
      action?: ActivityType;
      entityType?: string;
    } = {};

    // Platform admins can filter by bakeryId or see all
    if (user.isPlatformAdmin) {
      if (options?.bakeryId) {
        where.bakeryId = options.bakeryId;
      }
    } else {
      // Regular users can only see their bakery's logs
      if (!user.bakeryId) {
        return { success: false, error: 'No bakery assigned' };
      }
      where.bakeryId = user.bakeryId;
    }

    if (options?.userId) {
      where.userId = options.userId;
    }

    if (options?.action) {
      where.action = options.action;
    }

    if (options?.entityType) {
      where.entityType = options.entityType;
    }

    const limit = options?.limit || 50;
    const offset = options?.offset || 0;

    const [logs, total] = await Promise.all([
      db.activityLog.findMany({
        where,
        include: {
          user: {
            select: {
              id: true,
              name: true,
              email: true,
            },
          },
          bakery: {
            select: {
              id: true,
              name: true,
            },
          },
        },
        orderBy: {
          createdAt: 'desc',
        },
        take: limit,
        skip: offset,
      }),
      db.activityLog.count({ where }),
    ]);

    return { success: true, data: { logs, total } };
  } catch (error) {
    console.error('Failed to fetch activity logs:', error);
    return { success: false, error: 'Failed to fetch activity logs' };
  }
}

/**
 * Get platform-wide activity logs (platform admins only)
 */
export async function getPlatformActivityLogs(options?: {
  action?: ActivityType;
  entityType?: string;
  limit?: number;
  offset?: number;
}) {
  try {
    const user = await getCurrentUser();

    if (!user?.isPlatformAdmin) {
      return { success: false, error: 'Unauthorized' };
    }

    return getActivityLogs(options);
  } catch (error) {
    console.error('Failed to fetch platform activity logs:', error);
    return { success: false, error: 'Failed to fetch platform activity logs' };
  }
}

/**
 * Get recent activity for dashboard displays
 */
export async function getRecentActivityLogs(limit: number = 10) {
  try {
    const user = await getCurrentUser();

    if (!user) {
      return { success: false, error: 'Unauthorized' };
    }

    const where: { bakeryId?: string } = {};

    // Regular users only see their bakery's activity
    if (!user.isPlatformAdmin) {
      if (!user.bakeryId) {
        return { success: false, error: 'No bakery assigned' };
      }
      where.bakeryId = user.bakeryId;
    }

    const logs = await db.activityLog.findMany({
      where,
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
        bakery: {
          select: {
            id: true,
            name: true,
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
    console.error('Failed to fetch recent activity logs:', error);
    return { success: false, error: 'Failed to fetch recent activity logs' };
  }
}
