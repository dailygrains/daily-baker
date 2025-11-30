'use server';

import { db } from '@/lib/db';
import { getCurrentUser } from '@/lib/clerk';

export async function getPlatformStats() {
  try {
    const user = await getCurrentUser();

    if (!user?.isPlatformAdmin) {
      return {
        success: false,
        error: 'Unauthorized: Only platform administrators can view platform stats',
      };
    }

    const [
      totalBakeries,
      totalUsers,
      totalRecipes,
      totalIngredients,
      recentBakeries,
      recentUsers,
    ] = await Promise.all([
      // Total counts
      db.bakery.count(),
      db.user.count(),
      db.recipe.count(),
      db.ingredient.count(),

      // Recent additions (last 30 days)
      db.bakery.count({
        where: {
          createdAt: {
            gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
          },
        },
      }),
      db.user.count({
        where: {
          createdAt: {
            gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
          },
        },
      }),
    ]);

    // Get bakeries with user counts
    const bakeriesWithCounts = await db.bakery.findMany({
      select: {
        id: true,
        name: true,
        _count: {
          select: {
            users: true,
            recipes: true,
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
      take: 10,
    });

    return {
      success: true,
      data: {
        totals: {
          bakeries: totalBakeries,
          users: totalUsers,
          recipes: totalRecipes,
          ingredients: totalIngredients,
        },
        recent: {
          bakeries: recentBakeries,
          users: recentUsers,
        },
        topBakeries: bakeriesWithCounts,
      },
    };
  } catch (error) {
    console.error('Error fetching platform stats:', error);
    return {
      success: false,
      error: 'Failed to fetch platform statistics',
    };
  }
}

export async function getRecentActivity() {
  try {
    const user = await getCurrentUser();

    if (!user?.isPlatformAdmin) {
      return {
        success: false,
        error: 'Unauthorized',
      };
    }

    // Get recent bakeries
    const recentBakeries = await db.bakery.findMany({
      orderBy: { createdAt: 'desc' },
      take: 5,
      select: {
        id: true,
        name: true,
        createdAt: true,
      },
    });

    // Get recent users
    const recentUsers = await db.user.findMany({
      orderBy: { createdAt: 'desc' },
      take: 5,
      select: {
        id: true,
        name: true,
        email: true,
        createdAt: true,
      },
    });

    // Get recent recipes
    const recentRecipes = await db.recipe.findMany({
      orderBy: { createdAt: 'desc' },
      take: 5,
      select: {
        id: true,
        name: true,
        createdAt: true,
        bakery: {
          select: {
            name: true,
          },
        },
      },
    });

    return {
      success: true,
      data: {
        bakeries: recentBakeries,
        users: recentUsers,
        recipes: recentRecipes,
      },
    };
  } catch (error) {
    console.error('Error fetching recent activity:', error);
    return {
      success: false,
      error: 'Failed to fetch recent activity',
    };
  }
}
