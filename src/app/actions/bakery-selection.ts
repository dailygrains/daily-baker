'use server';

import { setBakeryCookie } from '@/lib/cookies';
import { getCurrentUser } from '@/lib/clerk';
import { prisma } from '@/lib/prisma';
import { revalidatePath } from 'next/cache';

/**
 * Server action to securely set bakery selection cookie
 * Replaces client-side document.cookie manipulation for better security
 * Validates user authentication and bakery access permissions
 */
export async function selectBakeryAction(bakeryId: string) {
  try {
    // Validate user authentication
    const user = await getCurrentUser();
    if (!user) {
      return { success: false, error: 'Not authenticated' };
    }

    // Verify bakery exists and is active
    const bakery = await prisma.bakery.findUnique({
      where: { id: bakeryId, isActive: true },
    });

    if (!bakery) {
      return { success: false, error: 'Bakery not found or inactive' };
    }

    // Platform admins can select any bakery
    // Regular users must have explicit access
    if (!user.isPlatformAdmin) {
      const hasAccess = user.allBakeries.some(b => b.id === bakeryId);
      if (!hasAccess) {
        return { success: false, error: 'Access denied to this bakery' };
      }
    }

    await setBakeryCookie(bakeryId);
    // Revalidate to refresh server components with new bakery selection
    revalidatePath('/', 'layout');
    return { success: true };
  } catch (error) {
    console.error('Failed to set bakery cookie:', error);
    return { success: false, error: 'Failed to update bakery selection' };
  }
}
