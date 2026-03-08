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
  console.warn('[API Auth] authHeader:', authHeader ? `${authHeader.slice(0, 20)}...` : 'none');

  if (!authHeader?.startsWith('Bearer ')) {
    console.warn('[API Auth] No Bearer header, falling back to Clerk');
    return resolveClerkAuth();
  }

  const token = authHeader.slice(7);
  console.warn('[API Auth] Token prefix:', token.slice(0, 12));

  if (token.startsWith('dbk_')) {
    return resolveApiKeyAuth(token);
  }

  // Assume Clerk JWT for non-dbk_ bearer tokens
  return resolveClerkAuth();
}

async function resolveApiKeyAuth(token: string): Promise<ApiAuthContext | null> {
  // Find by prefix (first 12 chars: "dbk_" + 8 char id)
  const prefix = token.slice(0, 12);

  let apiKey;
  try {
    apiKey = await db.apiKey.findFirst({
      where: {
        prefix,
        revokedAt: null,
      },
    });
  } catch (err) {
    console.error('[API Auth] DB query failed:', err);
    return null;
  }

  if (!apiKey) {
    console.warn('[API Auth] No key found for prefix:', prefix);
    return null;
  }

  // Verify full key hash
  const valid = await bcrypt.compare(token, apiKey.keyHash);
  if (!valid) {
    console.warn('[API Auth] Hash mismatch for key:', apiKey.name);
    return null;
  }

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
