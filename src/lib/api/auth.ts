import { NextRequest } from 'next/server';
import bcrypt from 'bcryptjs';
import { db } from '@/lib/db';
import { getCurrentUser } from '@/lib/clerk';

export interface ApiAuthContext {
  bakeryId: string;
  userId: string | null;
  isApiKey: boolean;
  scopes: string[];
  isPlatformAdmin: boolean;
}

/**
 * Resolve auth from either API key (dbk_*) or Clerk JWT.
 * Returns null if unauthenticated.
 */
export async function resolveApiAuth(req: NextRequest): Promise<ApiAuthContext | null> {
  const authHeader = req.headers.get('authorization');

  if (!authHeader?.startsWith('Bearer ')) {
    // Fall back to Clerk cookie-based auth (browser requests)
    return resolveClerkAuth();
  }

  const token = authHeader.slice(7);

  if (token.startsWith('dbk_')) {
    return resolveApiKeyAuth(token);
  }

  // Assume Clerk JWT for non-dbk_ bearer tokens
  return resolveClerkAuth();
}

async function resolveApiKeyAuth(token: string): Promise<ApiAuthContext | null> {
  // Find by prefix (first 12 chars: "dbk_" + 8 char id)
  const prefix = token.slice(0, 12);

  const apiKey = await db.apiKey.findFirst({
    where: {
      prefix,
      revokedAt: null,
    },
  });

  if (!apiKey) return null;

  // Verify full key hash
  const valid = await bcrypt.compare(token, apiKey.keyHash);
  if (!valid) return null;

  // Check expiration
  if (apiKey.expiresAt && apiKey.expiresAt < new Date()) return null;

  // Update last used (fire and forget)
  db.apiKey.update({
    where: { id: apiKey.id },
    data: { lastUsedAt: new Date() },
  }).catch(() => {});

  const scopes = (apiKey.scopes as string[]) || [];

  return {
    bakeryId: apiKey.bakeryId,
    userId: null,
    isApiKey: true,
    scopes,
    isPlatformAdmin: false,
  };
}

async function resolveClerkAuth(): Promise<ApiAuthContext | null> {
  const user = await getCurrentUser();
  if (!user) return null;

  return {
    bakeryId: user.bakeryId ?? '',
    userId: user.id,
    isApiKey: false,
    scopes: ['read', 'write'],
    isPlatformAdmin: user.isPlatformAdmin,
  };
}

/**
 * Check if auth context has required scope.
 */
export function hasScope(auth: ApiAuthContext, scope: 'read' | 'write'): boolean {
  if (auth.isPlatformAdmin) return true;
  return auth.scopes.includes(scope);
}
