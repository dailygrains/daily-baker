'use server';

import { setBakeryCookie } from '@/lib/cookies';
import { revalidatePath } from 'next/cache';

/**
 * Server action to securely set bakery selection cookie
 * Replaces client-side document.cookie manipulation for better security
 */
export async function selectBakeryAction(bakeryId: string) {
  try {
    await setBakeryCookie(bakeryId);
    // Revalidate to refresh server components with new bakery selection
    revalidatePath('/', 'layout');
    return { success: true };
  } catch (error) {
    console.error('Failed to set bakery cookie:', error);
    return { success: false, error: 'Failed to update bakery selection' };
  }
}
