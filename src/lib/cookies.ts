import { cookies } from 'next/headers';

/**
 * Cookie names used throughout the application
 */
export const COOKIES = {
  BAKERY_ID: 'selectedBakeryId',
} as const;

/**
 * Cookie configuration defaults
 */
const COOKIE_DEFAULTS = {
  BAKERY_ID: {
    maxAge: 60 * 60 * 24 * 365, // 1 year
    path: '/',
    sameSite: 'lax' as const,
  },
};

/**
 * Get the selected bakery ID from cookies
 */
export async function getBakeryCookie(): Promise<string | undefined> {
  const cookieStore = await cookies();
  return cookieStore.get(COOKIES.BAKERY_ID)?.value;
}

/**
 * Set the selected bakery ID cookie
 */
export async function setBakeryCookie(bakeryId: string): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.set(COOKIES.BAKERY_ID, bakeryId, COOKIE_DEFAULTS.BAKERY_ID);
}

/**
 * Delete the selected bakery ID cookie
 */
export async function deleteBakeryCookie(): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.delete(COOKIES.BAKERY_ID);
}
