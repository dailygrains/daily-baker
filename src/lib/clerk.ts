import { currentUser } from '@clerk/nextjs/server';
import { prisma } from './prisma';

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

  // Transform user object to add convenience properties
  // Get the first bakery (for now, assuming single bakery per user)
  const firstBakery = user.bakeries[0];

  return {
    ...user,
    bakery: firstBakery?.bakery,
    bakeryId: firstBakery?.bakeryId,
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
