import { ZodError } from 'zod';
import { getCurrentUser } from '@/lib/clerk';
import { ServiceError, type ServiceContext } from './context';

/** Build a service context for the signed-in dashboard user, or null. */
export async function actionContext(): Promise<ServiceContext | null> {
  const user = await getCurrentUser();
  if (!user) return null;
  return {
    bakeryId: user.bakeryId ?? null,
    userId: user.id ?? null,
    isPlatformAdmin: Boolean(user.isPlatformAdmin),
  };
}

/** The `{ success, data?, error? }` envelope server actions return. */
export type ActionResult<T = never> = {
  success: boolean;
  data?: T;
  error?: string;
  warnings?: string[];
};

export const UNAUTHORIZED: ActionResult = {
  success: false,
  error: 'Unauthorized: You must be logged in',
};

/**
 * Turn a thrown error into the `{ success: false, error }` shape server
 * actions return. Expected failures keep their message; anything else is
 * logged and replaced with `fallback`.
 */
export function actionError(error: unknown, fallback: string): ActionResult {
  if (error instanceof ServiceError) {
    return { success: false, error: error.message };
  }
  if (error instanceof ZodError) {
    return { success: false, error: error.issues.map((i) => i.message).join('. ') };
  }
  console.error(fallback, error);
  return { success: false, error: fallback };
}
