/**
 * Core Snapshot Types
 *
 * Generic types for the snapshot pattern that can be used
 * across different entity types (recipes, production sheets, etc.)
 */

/**
 * Trigger types for when a snapshot is created
 */
export type SnapshotTrigger = 'SAVE' | 'COMPLETE';

/**
 * Metadata attached to every snapshot
 */
export interface SnapshotMetadata {
  /** Unique identifier for this snapshot */
  id: string;
  /** Schema version for migration support */
  schemaVersion: number;
  /** Type of entity being snapshotted */
  entityType: string;
  /** ID of the entity being snapshotted */
  entityId: string;
  /** Human-readable name of the entity */
  entityName: string;
  /** Bakery that owns this entity */
  bakeryId: string;
  /** ISO timestamp of when the snapshot was created */
  createdAt: string;
  /** What triggered this snapshot */
  trigger: SnapshotTrigger;
  /** User ID who triggered the snapshot (if available) */
  triggeredBy?: string;
}

/**
 * Complete snapshot structure stored in S3
 */
export interface Snapshot<T> {
  metadata: SnapshotMetadata;
  data: T;
}

/**
 * Interface for entity-specific serializers
 *
 * Each entity type (Recipe, ProductionSheet, etc.) must implement
 * this interface to define how it's serialized to a snapshot.
 */
export interface SnapshotSerializer<TEntity, TSnapshot> {
  /** The entity type identifier (e.g., 'recipe', 'production-sheet') */
  entityType: string;

  /** Current schema version for this entity type */
  currentSchemaVersion: number;

  /**
   * Serialize an entity to its snapshot representation
   * @param entity - The entity to serialize
   * @returns The serialized snapshot data
   */
  serialize(entity: TEntity): TSnapshot;

  /**
   * Validate that unknown data matches the expected snapshot structure
   * @param data - Unknown data to validate
   * @returns Type guard indicating if data is valid
   */
  validate(data: unknown): data is TSnapshot;

  /**
   * Migrate snapshot data from an older version to current
   * @param data - Snapshot data in an older format
   * @param fromVersion - The version the data is in
   * @returns Data migrated to current schema version
   */
  migrate(data: unknown, fromVersion: number): TSnapshot;
}

/**
 * Options for listing snapshots
 */
export interface ListSnapshotsOptions {
  /** Maximum number of snapshots to return */
  limit?: number;
  /** Filter by trigger type */
  trigger?: SnapshotTrigger;
}

/**
 * Snapshot list item returned when listing snapshots
 */
export interface SnapshotListItem {
  /** S3 key for this snapshot */
  s3Key: string;
  /** Entity type */
  entityType: string;
  /** Entity ID */
  entityId: string;
  /** Schema version */
  schemaVersion: number;
  /** When the snapshot was created */
  createdAt: string;
  /** What triggered this snapshot */
  trigger: SnapshotTrigger;
  /** File size in bytes */
  size?: number;
}

/**
 * Result of comparing two snapshots
 */
export interface SnapshotDiff {
  /** S3 key of the older snapshot */
  olderKey: string;
  /** S3 key of the newer snapshot */
  newerKey: string;
  /** Time between snapshots */
  timeDelta: string;
  /** Fields that were added */
  added: string[];
  /** Fields that were removed */
  removed: string[];
  /** Fields that were modified */
  modified: Array<{
    path: string;
    oldValue: unknown;
    newValue: unknown;
  }>;
}
