import { currentUser } from '@clerk/nextjs/server';
import { prisma } from './prisma';
import { getBakeryCookie } from './cookies';

/**
 * Get the current user from Clerk and sync with database
 * Creates user record if it doesn't exist
 */
export async function getCurrentUser() {
  const clerkUser = await currentUser();

  if (!clerkUser) {
    return null;
  }

  // Find or create user in database
  let user = await prisma.user.findUnique({
    where: { clerkId: clerkUser.id },
    include: {
      bakeries: {
        include: {
          bakery: true,
        },
      },
      role: true,
    },
  });

  if (!user) {
    // Create new user record
    user = await prisma.user.create({
      data: {
        clerkId: clerkUser.id,
        email: clerkUser.emailAddresses[0]?.emailAddress ?? '',
        name: `${clerkUser.firstName ?? ''} ${clerkUser.lastName ?? ''}`.trim() || null,
        imageUrl: clerkUser.imageUrl,
        lastLoginAt: new Date(),
      },
      include: {
        bakeries: {
          include: {
            bakery: true,
          },
        },
        role: true,
      },
    });
  } else {
    // Update last login and sync imageUrl in case it changed
    await prisma.user.update({
      where: { id: user.id },
      data: {
        lastLoginAt: new Date(),
        imageUrl: clerkUser.imageUrl,
      },
    });
  }

  // Transform user object to add convenience properties for backward compatibility
  // IMPORTANT: The schema supports many-to-many user-bakery relationships,
  // but we return only the selected/first bakery here to maintain backward compatibility
  // with existing code that expects a single bakery. This is temporary until
  // full multi-bakery support is implemented throughout the application.

  // Get selected bakery ID from cookie (for multi-bakery users)
  let selectedBakeryId: string | undefined;
  try {
    selectedBakeryId = await getBakeryCookie();
  } catch (error) {
    console.error('Failed to read bakery cookie:', error);
    selectedBakeryId = undefined;
  }

  // Find the selected bakery based on cookie or auto-selection
  // Regular users with only one bakery: auto-select it
  // Platform admins: use cookie selection, or auto-select first active bakery
  let currentBakery = user.bakeries.length > 0 ? user.bakeries[0] : undefined;
  let currentBakeryData: (typeof user.bakeries[0]['bakery']) | undefined = undefined;
  let currentBakeryIdValue: string | undefined = undefined;

  // Auto-select for regular users with exactly one bakery
  if (!user.isPlatformAdmin && user.bakeries.length === 1 && currentBakery) {
    currentBakeryData = currentBakery.bakery;
    currentBakeryIdValue = currentBakery.bakeryId;
  }

  // Override with cookie selection if present
  if (selectedBakeryId) {
    if (user.isPlatformAdmin) {
      // Platform admins can select any active bakery, even if not assigned
      const selectedBakery = await prisma.bakery.findUnique({
        where: { id: selectedBakeryId, isActive: true },
      });
      if (selectedBakery) {
        currentBakeryData = selectedBakery;
        currentBakeryIdValue = selectedBakery.id;
      }
    } else {
      // Regular users can only select from their assigned bakeries
      const selected = user.bakeries.find(ub => ub.bakeryId === selectedBakeryId);
      if (selected) {
        currentBakery = selected;
        currentBakeryData = selected.bakery;
        currentBakeryIdValue = selected.bakeryId;
      }
    }
  }

  // Log warning if user has multiple bakeries (helps identify when migration is needed)
  // Only log in development to avoid production log clutter
  if (process.env.NODE_ENV === 'development' && user.bakeries.length > 1 && !user.isPlatformAdmin) {
    console.warn(
      `User ${user.id} has ${user.bakeries.length} bakeries assigned. ` +
      `Using bakery: ${currentBakeryData?.name ?? 'none selected'} (${currentBakeryIdValue ?? 'null'})`
    );
  }

  // Log info for platform admins without selection (should be rare now with auto-select)
  // Only log in development to avoid production log clutter
  if (process.env.NODE_ENV === 'development' && user.isPlatformAdmin && !currentBakeryIdValue) {
    console.info(`Platform admin ${user.id} has no bakery selected (no active bakeries in system)`);
  }

  // Platform admins should see ALL active bakeries, not just assigned ones
  let allBakeries;
  if (user.isPlatformAdmin) {
    const allSystemBakeries = await prisma.bakery.findMany({
      where: { isActive: true },
      select: {
        id: true,
        name: true,
      },
      orderBy: {
        name: 'asc',
      },
    });
    allBakeries = allSystemBakeries;

    // Auto-select first bakery for platform admins if no valid selection exists
    if (!currentBakeryIdValue && allSystemBakeries.length > 0) {
      currentBakeryData = allSystemBakeries[0] as typeof currentBakeryData;
      currentBakeryIdValue = allSystemBakeries[0].id;
    }
  } else {
    // Regular users only see their assigned bakeries
    allBakeries = user.bakeries.map(ub => ({
      id: ub.bakery.id,
      name: ub.bakery.name,
    }));
  }

  return {
    ...user,
    bakery: currentBakeryData,
    bakeryId: currentBakeryIdValue,
    // Expose all bakeries for the selector
    allBakeries,
  };
}

/**
 * Check if current user is a platform admin
 */
export async function isPlatformAdmin() {
  const user = await getCurrentUser();
  return user?.isPlatformAdmin ?? false;
}

/**
 * Get user's bakery IDs (empty array for platform admins without assigned bakeries)
 */
export async function getUserBakeryIds() {
  const user = await getCurrentUser();
  if (!user) return [];

  const userBakeries = await prisma.userBakery.findMany({
    where: { userId: user.id },
    select: { bakeryId: true },
  });

  return userBakeries.map(ub => ub.bakeryId);
}

/**
 * Require authentication - throws if not logged in
 */
export async function requireAuth() {
  const user = await getCurrentUser();
  if (!user) {
    throw new Error('Unauthorized');
  }
  return user;
}

/**
 * Require platform admin - throws if not platform admin
 */
export async function requirePlatformAdmin() {
  const user = await requireAuth();
  if (!user.isPlatformAdmin) {
    throw new Error('Platform admin access required');
  }
  return user;
}

/**
 * Require bakery association - throws if user has no bakeries (platform admins exempt)
 */
export async function requireBakeryUser() {
  const user = await requireAuth();

  // Platform admins don't need bakery assignment
  if (user.isPlatformAdmin) {
    return user;
  }

  const bakeryCount = await prisma.userBakery.count({
    where: { userId: user.id },
  });

  if (bakeryCount === 0) {
    throw new Error('Bakery association required');
  }
  return user;
}
