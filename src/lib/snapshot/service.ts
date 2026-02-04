/**
 * Generic Snapshot Service
 *
 * Provides a high-level API for creating and managing snapshots
 * for any entity type. Uses serializers for entity-specific logic.
 */

import { nanoid } from 'nanoid';
import type {
  Snapshot,
  SnapshotMetadata,
  SnapshotSerializer,
  SnapshotTrigger,
  SnapshotListItem,
  ListSnapshotsOptions,
  SnapshotDiff,
} from './types';
import {
  uploadSnapshot,
  getSnapshot,
  listSnapshots,
  getLatestSnapshot,
  getSnapshotMetadata,
} from './s3';

/**
 * Generic snapshot service for creating and managing entity snapshots
 */
export class SnapshotService<TEntity, TSnapshot> {
  private serializer: SnapshotSerializer<TEntity, TSnapshot>;

  constructor(serializer: SnapshotSerializer<TEntity, TSnapshot>) {
    this.serializer = serializer;
  }

  /**
   * Create a new snapshot for an entity
   *
   * @param entity - The entity to snapshot
   * @param bakeryId - Bakery that owns the entity
   * @param entityId - ID of the entity
   * @param entityName - Human-readable name of the entity
   * @param trigger - What triggered this snapshot
   * @param triggeredBy - User ID who triggered (optional)
   * @returns The S3 key where the snapshot was stored
   */
  async createSnapshot(
    entity: TEntity,
    bakeryId: string,
    entityId: string,
    entityName: string,
    trigger: SnapshotTrigger,
    triggeredBy?: string
  ): Promise<string> {
    // Serialize the entity
    const data = this.serializer.serialize(entity);

    // Build metadata
    const metadata: SnapshotMetadata = {
      id: nanoid(),
      schemaVersion: this.serializer.currentSchemaVersion,
      entityType: this.serializer.entityType,
      entityId,
      entityName,
      bakeryId,
      createdAt: new Date().toISOString(),
      trigger,
      triggeredBy,
    };

    // Build complete snapshot
    const snapshot: Snapshot<TSnapshot> = {
      metadata,
      data,
    };

    // Upload to S3
    const s3Key = await uploadSnapshot(snapshot);

    return s3Key;
  }

  /**
   * Get the latest snapshot for an entity
   *
   * @param bakeryId - Bakery that owns the entity
   * @param entityId - ID of the entity
   * @returns The latest snapshot or null
   */
  async getLatestSnapshot(
    bakeryId: string,
    entityId: string
  ): Promise<Snapshot<TSnapshot> | null> {
    const snapshot = await getLatestSnapshot<TSnapshot>(
      bakeryId,
      this.serializer.entityType,
      entityId
    );

    if (!snapshot) {
      return null;
    }

    // Migrate if needed
    if (snapshot.metadata.schemaVersion < this.serializer.currentSchemaVersion) {
      snapshot.data = this.serializer.migrate(
        snapshot.data,
        snapshot.metadata.schemaVersion
      );
      snapshot.metadata.schemaVersion = this.serializer.currentSchemaVersion;
    }

    return snapshot;
  }

  /**
   * List all snapshots for an entity
   *
   * @param bakeryId - Bakery that owns the entity
   * @param entityId - ID of the entity
   * @param options - Listing options
   * @returns Array of snapshot list items
   */
  async listSnapshots(
    bakeryId: string,
    entityId: string,
    options?: ListSnapshotsOptions
  ): Promise<SnapshotListItem[]> {
    let items = await listSnapshots(bakeryId, this.serializer.entityType, entityId);

    // Apply options
    if (options?.trigger) {
      // Need to fetch metadata to filter by trigger
      const enrichedItems = await Promise.all(
        items.map(async (item) => {
          const metadata = await getSnapshotMetadata(item.s3Key);
          return {
            ...item,
            trigger: metadata?.trigger ?? 'SAVE',
          };
        })
      );
      items = enrichedItems.filter((item) => item.trigger === options.trigger);
    }

    if (options?.limit && items.length > options.limit) {
      items = items.slice(0, options.limit);
    }

    return items;
  }

  /**
   * Get a snapshot by its S3 key
   *
   * @param s3Key - The S3 key of the snapshot
   * @returns The snapshot or null
   */
  async getSnapshotByKey(s3Key: string): Promise<Snapshot<TSnapshot> | null> {
    const snapshot = await getSnapshot<TSnapshot>(s3Key);

    if (!snapshot) {
      return null;
    }

    // Validate the data
    if (!this.serializer.validate(snapshot.data)) {
      // Try to migrate
      if (snapshot.metadata.schemaVersion < this.serializer.currentSchemaVersion) {
        snapshot.data = this.serializer.migrate(
          snapshot.data,
          snapshot.metadata.schemaVersion
        );
        snapshot.metadata.schemaVersion = this.serializer.currentSchemaVersion;
      } else {
        console.error('Invalid snapshot data that cannot be migrated:', s3Key);
        return null;
      }
    }

    return snapshot;
  }

  /**
   * Compare two snapshots and return the differences
   *
   * @param olderKey - S3 key of the older snapshot
   * @param newerKey - S3 key of the newer snapshot
   * @returns Diff showing changes between snapshots
   */
  async compareSnapshots(
    olderKey: string,
    newerKey: string
  ): Promise<SnapshotDiff | null> {
    const [older, newer] = await Promise.all([
      this.getSnapshotByKey(olderKey),
      this.getSnapshotByKey(newerKey),
    ]);

    if (!older || !newer) {
      return null;
    }

    const diff: SnapshotDiff = {
      olderKey,
      newerKey,
      timeDelta: this.calculateTimeDelta(
        older.metadata.createdAt,
        newer.metadata.createdAt
      ),
      added: [],
      removed: [],
      modified: [],
    };

    // Deep compare the data objects
    this.compareObjects(older.data, newer.data, '', diff);

    return diff;
  }

  /**
   * Calculate human-readable time delta between two timestamps
   */
  private calculateTimeDelta(older: string, newer: string): string {
    const olderDate = new Date(older);
    const newerDate = new Date(newer);
    const diffMs = newerDate.getTime() - olderDate.getTime();

    const seconds = Math.floor(diffMs / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);
    const days = Math.floor(hours / 24);

    if (days > 0) {
      return `${days} day${days > 1 ? 's' : ''}`;
    }
    if (hours > 0) {
      return `${hours} hour${hours > 1 ? 's' : ''}`;
    }
    if (minutes > 0) {
      return `${minutes} minute${minutes > 1 ? 's' : ''}`;
    }
    return `${seconds} second${seconds !== 1 ? 's' : ''}`;
  }

  /**
   * Recursively compare two objects and populate the diff
   */
  private compareObjects(
    older: unknown,
    newer: unknown,
    path: string,
    diff: SnapshotDiff
  ): void {
    // Handle null/undefined
    if (older === null || older === undefined) {
      if (newer !== null && newer !== undefined) {
        diff.added.push(path || 'root');
      }
      return;
    }

    if (newer === null || newer === undefined) {
      diff.removed.push(path || 'root');
      return;
    }

    // Handle primitives
    if (typeof older !== 'object' || typeof newer !== 'object') {
      if (older !== newer) {
        diff.modified.push({
          path: path || 'root',
          oldValue: older,
          newValue: newer,
        });
      }
      return;
    }

    // Handle arrays
    if (Array.isArray(older) && Array.isArray(newer)) {
      const maxLen = Math.max(older.length, newer.length);
      for (let i = 0; i < maxLen; i++) {
        const itemPath = path ? `${path}[${i}]` : `[${i}]`;
        if (i >= older.length) {
          diff.added.push(itemPath);
        } else if (i >= newer.length) {
          diff.removed.push(itemPath);
        } else {
          this.compareObjects(older[i], newer[i], itemPath, diff);
        }
      }
      return;
    }

    // Handle objects
    const olderObj = older as Record<string, unknown>;
    const newerObj = newer as Record<string, unknown>;
    const allKeys = new Set([...Object.keys(olderObj), ...Object.keys(newerObj)]);

    for (const key of allKeys) {
      const keyPath = path ? `${path}.${key}` : key;

      if (!(key in olderObj)) {
        diff.added.push(keyPath);
      } else if (!(key in newerObj)) {
        diff.removed.push(keyPath);
      } else {
        this.compareObjects(olderObj[key], newerObj[key], keyPath, diff);
      }
    }
  }
}
