/**
 * Production Sheet Snapshot Serializer
 *
 * Wraps the existing production sheet snapshot logic and integrates
 * it with the generic snapshot service.
 */

import type { SnapshotSerializer } from './types';
import { SnapshotService } from './service';
import {
  createProductionSheetSnapshot,
  isValidSnapshot,
  type ProductionSheetSnapshot,
  type SnapshotRecipe,
  type SnapshotAggregatedIngredient,
} from '@/lib/productionSheetSnapshot';
import type { ProductionSheetRecipeEntry } from '@/lib/ingredientAggregation';

// Re-export the existing types for convenience
export type {
  ProductionSheetSnapshot,
  SnapshotRecipe,
  SnapshotAggregatedIngredient,
  SnapshotSection,
  SnapshotIngredient,
} from '@/lib/productionSheetSnapshot';

/**
 * Production sheet entity type for the serializer
 * This structure contains the data needed to create a snapshot
 */
export interface ProductionSheetEntity {
  id: string;
  description: string | null;
  recipes: ProductionSheetRecipeEntry[];
}

/**
 * Production sheet serializer implementation
 *
 * This delegates to the existing createProductionSheetSnapshot function
 * to maintain compatibility with the existing snapshot format.
 */
export const productionSheetSerializer: SnapshotSerializer<
  ProductionSheetEntity,
  ProductionSheetSnapshot
> = {
  entityType: 'production-sheet',
  currentSchemaVersion: 1,

  serialize(entity: ProductionSheetEntity): ProductionSheetSnapshot {
    // Delegate to existing snapshot creation function
    return createProductionSheetSnapshot(entity.recipes);
  },

  validate(data: unknown): data is ProductionSheetSnapshot {
    return isValidSnapshot(data);
  },

  migrate(data: unknown, fromVersion: number): ProductionSheetSnapshot {
    // Currently only version 1
    // The existing isValidSnapshot handles version checking
    if (fromVersion === 1) {
      return data as ProductionSheetSnapshot;
    }

    throw new Error(`Unknown production sheet snapshot version: ${fromVersion}`);
  },
};

/**
 * Pre-configured snapshot service for production sheets
 */
export const productionSheetSnapshotService = new SnapshotService(
  productionSheetSerializer
);

/**
 * Helper to convert any numeric value to number
 */
function toNumber(value: { toString(): string } | number): number {
  if (typeof value === 'number') return value;
  return parseFloat(value.toString());
}

/**
 * Helper to build ProductionSheetEntity from database data
 * This handles the type conversions from Decimal to number
 */
export function buildProductionSheetEntity(
  productionSheet: {
    id: string;
    description: string | null;
    recipes: Array<{
      id: string;
      scale: { toString(): string } | number;
      order: number;
      recipe: {
        id: string;
        name: string;
        yieldQty: number;
        yieldUnit: string;
        totalCost: { toString(): string } | number;
        sections: Array<{
          id: string;
          name: string;
          order: number;
          ingredients: Array<{
            id: string;
            quantity: { toString(): string } | number;
            unit: string;
            ingredient: {
              id: string;
              name: string;
              unit: string;
              inventory?: {
                displayUnit: string;
              } | null;
            };
          }>;
        }>;
      };
    }>;
  }
): ProductionSheetEntity {
  return {
    id: productionSheet.id,
    description: productionSheet.description,
    recipes: productionSheet.recipes.map((r) => ({
      id: r.id,
      scale: toNumber(r.scale),
      order: r.order,
      recipe: {
        id: r.recipe.id,
        name: r.recipe.name,
        yieldQty: r.recipe.yieldQty,
        yieldUnit: r.recipe.yieldUnit,
        totalCost: toNumber(r.recipe.totalCost),
        sections: r.recipe.sections.map((s) => ({
          id: s.id,
          name: s.name,
          order: s.order,
          ingredients: s.ingredients.map((i) => ({
            id: i.id,
            quantity: toNumber(i.quantity),
            unit: i.unit,
            ingredient: i.ingredient,
          })),
        })),
      },
    })),
  };
}
