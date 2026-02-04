/**
 * S3 Storage Operations for Snapshots
 *
 * Handles uploading, downloading, and listing snapshots in S3.
 * All snapshots are stored as JSON files with a structured key format.
 */

import {
  PutObjectCommand,
  GetObjectCommand,
  ListObjectsV2Command,
} from '@aws-sdk/client-s3';
import { s3Client } from '@/lib/s3';
import type { Snapshot, SnapshotListItem, SnapshotMetadata } from './types';

const BUCKET_NAME = process.env.AWS_S3_BUCKET_NAME!;

/**
 * Generate S3 key for a snapshot
 *
 * Format: snapshots/{bakeryId}/{entityType}/{entityId}/{timestamp}-v{version}.json
 * Note: ISO timestamps have colons replaced with dashes for S3 compatibility
 *
 * @param bakeryId - Bakery that owns the entity
 * @param entityType - Type of entity (e.g., 'recipe', 'production-sheet')
 * @param entityId - ID of the entity
 * @param timestamp - ISO timestamp (will be sanitized)
 * @param schemaVersion - Schema version number
 */
export function generateSnapshotKey(
  bakeryId: string,
  entityType: string,
  entityId: string,
  timestamp: string,
  schemaVersion: number
): string {
  // Replace colons with dashes for S3 compatibility
  const sanitizedTimestamp = timestamp.replace(/:/g, '-');
  return `snapshots/${bakeryId}/${entityType}/${entityId}/${sanitizedTimestamp}-v${schemaVersion}.json`;
}

/**
 * Parse snapshot metadata from an S3 key
 *
 * @param s3Key - The S3 key to parse
 * @returns Parsed metadata or null if key format is invalid
 */
export function parseSnapshotKey(s3Key: string): {
  bakeryId: string;
  entityType: string;
  entityId: string;
  timestamp: string;
  schemaVersion: number;
} | null {
  // snapshots/{bakeryId}/{entityType}/{entityId}/{timestamp}-v{version}.json
  const match = s3Key.match(
    /^snapshots\/([^/]+)\/([^/]+)\/([^/]+)\/(.+)-v(\d+)\.json$/
  );

  if (!match) {
    return null;
  }

  const [, bakeryId, entityType, entityId, sanitizedTimestamp, versionStr] = match;

  // Convert dashes back to colons in timestamp
  const timestamp = sanitizedTimestamp.replace(
    /(\d{4})-(\d{2})-(\d{2})T(\d{2})-(\d{2})-(\d{2})/,
    '$1-$2-$3T$4:$5:$6'
  );

  return {
    bakeryId,
    entityType,
    entityId,
    timestamp,
    schemaVersion: parseInt(versionStr, 10),
  };
}

/**
 * Upload a snapshot to S3
 *
 * @param snapshot - The snapshot object to upload
 * @returns The S3 key where the snapshot was stored
 */
export async function uploadSnapshot<T>(
  snapshot: Snapshot<T>
): Promise<string> {
  const { metadata } = snapshot;
  const s3Key = generateSnapshotKey(
    metadata.bakeryId,
    metadata.entityType,
    metadata.entityId,
    metadata.createdAt,
    metadata.schemaVersion
  );

  const command = new PutObjectCommand({
    Bucket: BUCKET_NAME,
    Key: s3Key,
    Body: JSON.stringify(snapshot, null, 2),
    ContentType: 'application/json',
    Metadata: {
      entityType: metadata.entityType,
      entityId: metadata.entityId,
      entityName: metadata.entityName,
      trigger: metadata.trigger,
      schemaVersion: metadata.schemaVersion.toString(),
    },
  });

  await s3Client.send(command);

  return s3Key;
}

/**
 * Get a snapshot from S3 by its key
 *
 * @param s3Key - The S3 key of the snapshot
 * @returns The snapshot object or null if not found
 */
export async function getSnapshot<T>(s3Key: string): Promise<Snapshot<T> | null> {
  try {
    const command = new GetObjectCommand({
      Bucket: BUCKET_NAME,
      Key: s3Key,
    });

    const response = await s3Client.send(command);

    if (!response.Body) {
      return null;
    }

    const bodyString = await response.Body.transformToString();
    return JSON.parse(bodyString) as Snapshot<T>;
  } catch (error) {
    // Handle not found errors gracefully
    if (
      error instanceof Error &&
      'name' in error &&
      error.name === 'NoSuchKey'
    ) {
      return null;
    }
    throw error;
  }
}

/**
 * List all snapshots for an entity
 *
 * @param bakeryId - Bakery that owns the entity
 * @param entityType - Type of entity
 * @param entityId - ID of the entity
 * @returns Array of snapshot list items, sorted by createdAt descending (newest first)
 */
export async function listSnapshots(
  bakeryId: string,
  entityType: string,
  entityId: string
): Promise<SnapshotListItem[]> {
  const prefix = `snapshots/${bakeryId}/${entityType}/${entityId}/`;

  const command = new ListObjectsV2Command({
    Bucket: BUCKET_NAME,
    Prefix: prefix,
  });

  const response = await s3Client.send(command);

  if (!response.Contents) {
    return [];
  }

  const items: SnapshotListItem[] = [];

  for (const object of response.Contents) {
    if (!object.Key) continue;

    const parsed = parseSnapshotKey(object.Key);
    if (!parsed) continue;

    items.push({
      s3Key: object.Key,
      entityType: parsed.entityType,
      entityId: parsed.entityId,
      schemaVersion: parsed.schemaVersion,
      createdAt: parsed.timestamp,
      // Trigger is not in the key, so we need to fetch it from the snapshot
      // For listing purposes, we'll default to 'SAVE' and let the UI fetch details
      trigger: 'SAVE',
      size: object.Size,
    });
  }

  // Sort by timestamp descending (newest first)
  items.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

  return items;
}

/**
 * Get the latest snapshot for an entity
 *
 * @param bakeryId - Bakery that owns the entity
 * @param entityType - Type of entity
 * @param entityId - ID of the entity
 * @returns The latest snapshot or null if none exists
 */
export async function getLatestSnapshot<T>(
  bakeryId: string,
  entityType: string,
  entityId: string
): Promise<Snapshot<T> | null> {
  const items = await listSnapshots(bakeryId, entityType, entityId);

  if (items.length === 0) {
    return null;
  }

  // Items are already sorted newest first
  return getSnapshot<T>(items[0].s3Key);
}

/**
 * Get snapshot metadata without downloading full content
 *
 * This is useful for listing snapshots with trigger info
 *
 * @param s3Key - The S3 key of the snapshot
 * @returns The snapshot metadata or null if not found
 */
export async function getSnapshotMetadata(
  s3Key: string
): Promise<SnapshotMetadata | null> {
  const snapshot = await getSnapshot(s3Key);
  return snapshot?.metadata ?? null;
}
