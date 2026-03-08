'use server';

import crypto from 'node:crypto';
import bcrypt from 'bcryptjs';
import { db } from '@/lib/db';
import { getCurrentUser } from '@/lib/clerk';
import { createActivityLog } from './activity';
import {
  createApiKeySchema,
  type CreateApiKeyInput,
} from '@/lib/validations/apiKey';
import { revalidatePath } from 'next/cache';

/**
 * Create a new API key.
 * Returns the raw key ONCE — it cannot be retrieved again.
 */
export async function createApiKey(data: CreateApiKeyInput) {
  try {
    const currentUser = await getCurrentUser();

    if (!currentUser) {
      return { success: false, error: 'Unauthorized: You must be logged in' };
    }

    // Verify user belongs to the bakery
    if (currentUser.bakeryId !== data.bakeryId) {
      return {
        success: false,
        error: 'Unauthorized: You can only create API keys for your bakery',
      };
    }

    // Validate input
    const validatedData = createApiKeySchema.parse(data);

    // Generate raw key: "dbk_" + 32 random hex chars
    const rawKey = 'dbk_' + crypto.randomBytes(16).toString('hex');

    // Prefix for lookup: first 12 chars (e.g. "dbk_xxxxxxxx")
    const prefix = rawKey.slice(0, 12);

    // Hash the full key for secure storage
    const keyHash = await bcrypt.hash(rawKey, 10);

    // Create the API key record
    const apiKey = await db.apiKey.create({
      data: {
        bakeryId: validatedData.bakeryId,
        name: validatedData.name,
        keyHash,
        prefix,
        scopes: validatedData.scopes,
        expiresAt: validatedData.expiresAt ?? null,
      },
    });

    // Log activity
    await createActivityLog({
      userId: currentUser.id!,
      action: 'CREATE',
      entityType: 'api_key',
      entityId: apiKey.id,
      entityName: apiKey.name,
      description: `Created API key "${apiKey.name}"`,
      metadata: {
        apiKeyId: apiKey.id,
        prefix,
        scopes: validatedData.scopes,
      },
      bakeryId: apiKey.bakeryId,
    });

    revalidatePath('/dashboard/settings');

    // Return the raw key — this is the only time it's available
    return {
      success: true,
      data: {
        id: apiKey.id,
        name: apiKey.name,
        prefix: apiKey.prefix,
        scopes: apiKey.scopes,
        expiresAt: apiKey.expiresAt,
        createdAt: apiKey.createdAt,
        rawKey,
      },
    };
  } catch (error) {
    console.error('Failed to create API key:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to create API key',
    };
  }
}

/**
 * List all API keys for a bakery (without key hashes).
 */
export async function listApiKeys(bakeryId: string) {
  try {
    const currentUser = await getCurrentUser();

    if (!currentUser) {
      return { success: false, error: 'Unauthorized: You must be logged in' };
    }

    // Verify user belongs to the bakery
    if (currentUser.bakeryId !== bakeryId) {
      return {
        success: false,
        error: 'Unauthorized: You can only view API keys for your bakery',
      };
    }

    const apiKeys = await db.apiKey.findMany({
      where: { bakeryId },
      select: {
        id: true,
        name: true,
        prefix: true,
        scopes: true,
        lastUsedAt: true,
        expiresAt: true,
        createdAt: true,
        revokedAt: true,
      },
      orderBy: { createdAt: 'desc' },
    });

    return { success: true, data: apiKeys };
  } catch (error) {
    console.error('Failed to list API keys:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to list API keys',
    };
  }
}

/**
 * Revoke an API key by setting a revokedAt timestamp.
 */
export async function revokeApiKey(id: string) {
  try {
    const currentUser = await getCurrentUser();

    if (!currentUser) {
      return { success: false, error: 'Unauthorized: You must be logged in' };
    }

    // Fetch the key to verify ownership
    const existingKey = await db.apiKey.findUnique({
      where: { id },
      select: { id: true, bakeryId: true, name: true, revokedAt: true },
    });

    if (!existingKey) {
      return { success: false, error: 'API key not found' };
    }

    // Verify user belongs to the same bakery
    if (currentUser.bakeryId !== existingKey.bakeryId) {
      return {
        success: false,
        error: 'Unauthorized: You can only revoke API keys for your bakery',
      };
    }

    if (existingKey.revokedAt) {
      return { success: false, error: 'API key is already revoked' };
    }

    // Revoke by setting timestamp
    const apiKey = await db.apiKey.update({
      where: { id },
      data: { revokedAt: new Date() },
    });

    // Log activity
    await createActivityLog({
      userId: currentUser.id!,
      action: 'DELETE',
      entityType: 'api_key',
      entityId: apiKey.id,
      entityName: apiKey.name,
      description: `Revoked API key "${apiKey.name}"`,
      metadata: {
        apiKeyId: apiKey.id,
      },
      bakeryId: apiKey.bakeryId,
    });

    revalidatePath('/dashboard/settings');

    return { success: true, data: { id: apiKey.id, revokedAt: apiKey.revokedAt } };
  } catch (error) {
    console.error('Failed to revoke API key:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to revoke API key',
    };
  }
}
