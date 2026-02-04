'use server';

import { getCurrentUser } from '@/lib/clerk';
import { db } from '@/lib/db';
import {
  listSnapshots,
  getSnapshot,
  getSnapshotMetadata,
  type Snapshot,
  type SnapshotListItem,
  type SnapshotDiff,
  recipeSnapshotService,
  productionSheetSnapshotService,
  type RecipeSnapshotData,
  type ProductionSheetSnapshot,
} from '@/lib/snapshot';

/**
 * Get all snapshots for an entity
 *
 * @param entityType - Type of entity ('recipe' or 'production-sheet')
 * @param entityId - ID of the entity
 * @returns List of snapshots with metadata
 */
export async function getEntitySnapshots(
  entityType: 'recipe' | 'production-sheet',
  entityId: string
): Promise<{
  success: boolean;
  error?: string;
  data?: SnapshotListItem[];
}> {
  try {
    const currentUser = await getCurrentUser();

    if (!currentUser) {
      return { success: false, error: 'Unauthorized: You must be logged in' };
    }

    if (!currentUser.bakeryId) {
      return { success: false, error: 'Unauthorized: No bakery associated with user' };
    }

    // Verify the entity belongs to the user's bakery
    if (entityType === 'recipe') {
      const recipe = await db.recipe.findUnique({
        where: { id: entityId },
        select: { bakeryId: true },
      });

      if (!recipe || recipe.bakeryId !== currentUser.bakeryId) {
        return { success: false, error: 'Recipe not found or unauthorized' };
      }
    } else if (entityType === 'production-sheet') {
      const productionSheet = await db.productionSheet.findUnique({
        where: { id: entityId },
        select: { bakeryId: true },
      });

      if (!productionSheet || productionSheet.bakeryId !== currentUser.bakeryId) {
        return { success: false, error: 'Production sheet not found or unauthorized' };
      }
    }

    // Get list of snapshots from S3
    const snapshots = await listSnapshots(
      currentUser.bakeryId,
      entityType,
      entityId
    );

    // Enrich with trigger information from metadata
    const enrichedSnapshots = await Promise.all(
      snapshots.map(async (snapshot) => {
        try {
          const metadata = await getSnapshotMetadata(snapshot.s3Key);
          return {
            ...snapshot,
            trigger: metadata?.trigger ?? 'SAVE',
          };
        } catch {
          return snapshot;
        }
      })
    );

    return { success: true, data: enrichedSnapshots };
  } catch (error) {
    console.error('Failed to get entity snapshots:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to get snapshots',
    };
  }
}

/**
 * Get snapshot data by S3 key
 *
 * @param s3Key - The S3 key of the snapshot
 * @returns The full snapshot data
 */
export async function getSnapshotData(
  s3Key: string
): Promise<{
  success: boolean;
  error?: string;
  data?: Snapshot<RecipeSnapshotData | ProductionSheetSnapshot>;
}> {
  try {
    const currentUser = await getCurrentUser();

    if (!currentUser) {
      return { success: false, error: 'Unauthorized: You must be logged in' };
    }

    if (!currentUser.bakeryId) {
      return { success: false, error: 'Unauthorized: No bakery associated with user' };
    }

    // Verify the S3 key belongs to the user's bakery
    if (!s3Key.startsWith(`snapshots/${currentUser.bakeryId}/`)) {
      return { success: false, error: 'Unauthorized: Snapshot does not belong to your bakery' };
    }

    const snapshot = await getSnapshot<RecipeSnapshotData | ProductionSheetSnapshot>(s3Key);

    if (!snapshot) {
      return { success: false, error: 'Snapshot not found' };
    }

    return { success: true, data: snapshot };
  } catch (error) {
    console.error('Failed to get snapshot data:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to get snapshot',
    };
  }
}

/**
 * Compare two snapshots and return the differences
 *
 * @param s3Key1 - S3 key of the first (older) snapshot
 * @param s3Key2 - S3 key of the second (newer) snapshot
 * @returns Diff showing changes between snapshots
 */
export async function compareSnapshots(
  s3Key1: string,
  s3Key2: string
): Promise<{
  success: boolean;
  error?: string;
  data?: SnapshotDiff;
}> {
  try {
    const currentUser = await getCurrentUser();

    if (!currentUser) {
      return { success: false, error: 'Unauthorized: You must be logged in' };
    }

    if (!currentUser.bakeryId) {
      return { success: false, error: 'Unauthorized: No bakery associated with user' };
    }

    // Verify both S3 keys belong to the user's bakery
    const bakeryPrefix = `snapshots/${currentUser.bakeryId}/`;
    if (!s3Key1.startsWith(bakeryPrefix) || !s3Key2.startsWith(bakeryPrefix)) {
      return { success: false, error: 'Unauthorized: Snapshots do not belong to your bakery' };
    }

    // Determine entity type from the S3 key
    const entityType = s3Key1.includes('/recipe/') ? 'recipe' : 'production-sheet';

    let diff: SnapshotDiff | null = null;

    if (entityType === 'recipe') {
      diff = await recipeSnapshotService.compareSnapshots(s3Key1, s3Key2);
    } else {
      diff = await productionSheetSnapshotService.compareSnapshots(s3Key1, s3Key2);
    }

    if (!diff) {
      return { success: false, error: 'Failed to compare snapshots' };
    }

    return { success: true, data: diff };
  } catch (error) {
    console.error('Failed to compare snapshots:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to compare snapshots',
    };
  }
}

/**
 * Get the latest snapshot for an entity
 *
 * @param entityType - Type of entity ('recipe' or 'production-sheet')
 * @param entityId - ID of the entity
 * @returns The latest snapshot or null
 */
export async function getLatestEntitySnapshot(
  entityType: 'recipe' | 'production-sheet',
  entityId: string
): Promise<{
  success: boolean;
  error?: string;
  data?: Snapshot<RecipeSnapshotData | ProductionSheetSnapshot> | null;
}> {
  try {
    const currentUser = await getCurrentUser();

    if (!currentUser) {
      return { success: false, error: 'Unauthorized: You must be logged in' };
    }

    if (!currentUser.bakeryId) {
      return { success: false, error: 'Unauthorized: No bakery associated with user' };
    }

    // Verify the entity belongs to the user's bakery
    if (entityType === 'recipe') {
      const recipe = await db.recipe.findUnique({
        where: { id: entityId },
        select: { bakeryId: true },
      });

      if (!recipe || recipe.bakeryId !== currentUser.bakeryId) {
        return { success: false, error: 'Recipe not found or unauthorized' };
      }

      const snapshot = await recipeSnapshotService.getLatestSnapshot(
        currentUser.bakeryId,
        entityId
      );

      return { success: true, data: snapshot };
    } else {
      const productionSheet = await db.productionSheet.findUnique({
        where: { id: entityId },
        select: { bakeryId: true },
      });

      if (!productionSheet || productionSheet.bakeryId !== currentUser.bakeryId) {
        return { success: false, error: 'Production sheet not found or unauthorized' };
      }

      const snapshot = await productionSheetSnapshotService.getLatestSnapshot(
        currentUser.bakeryId,
        entityId
      );

      return { success: true, data: snapshot };
    }
  } catch (error) {
    console.error('Failed to get latest snapshot:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to get latest snapshot',
    };
  }
}
