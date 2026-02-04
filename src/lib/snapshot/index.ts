/**
 * Snapshot Library
 *
 * Provides a generic pattern for creating and managing entity snapshots
 * stored in S3 for historical tracking and external analysis.
 */

// Core types
export type {
  SnapshotTrigger,
  SnapshotMetadata,
  Snapshot,
  SnapshotSerializer,
  ListSnapshotsOptions,
  SnapshotListItem,
  SnapshotDiff,
} from './types';

// S3 operations
export {
  generateSnapshotKey,
  parseSnapshotKey,
  uploadSnapshot,
  getSnapshot,
  listSnapshots,
  getLatestSnapshot,
  getSnapshotMetadata,
} from './s3';

// Generic service
export { SnapshotService } from './service';

// Recipe snapshots
export {
  recipeSerializer,
  recipeSnapshotService,
  type RecipeSnapshotData,
  type RecipeSnapshotSection,
  type RecipeSnapshotIngredient,
  type RecipeEntity,
} from './recipe';

// Production sheet snapshots
export {
  productionSheetSerializer,
  productionSheetSnapshotService,
  buildProductionSheetEntity,
  type ProductionSheetEntity,
  type ProductionSheetSnapshot,
  type SnapshotRecipe,
  type SnapshotAggregatedIngredient,
} from './productionSheet';
