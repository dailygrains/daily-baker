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
      bakery: true,
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
        lastLoginAt: new Date(),
      },
      include: {
        bakery: true,
        role: true,
      },
    });
  } else {
    // Update last login
    await prisma.user.update({
      where: { id: user.id },
      data: { lastLoginAt: new Date() },
    });
  }

  return user;
}

/**
 * Check if current user is a platform admin
 */
export async function isPlatformAdmin() {
  const user = await getCurrentUser();
  return user?.isPlatformAdmin ?? false;
}

/**
 * Get user's bakery ID (null for platform admins without assigned bakery)
 */
export async function getUserBakeryId() {
  const user = await getCurrentUser();
  return user?.bakeryId ?? null;
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
 * Require bakery association - throws if user has no bakery
 */
export async function requireBakeryUser() {
  const user = await requireAuth();
  if (!user.bakeryId) {
    throw new Error('Bakery association required');
  }
  return user;
}
