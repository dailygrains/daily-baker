/**
 * Recipe Snapshot Serializer
 *
 * Defines how Recipe entities are serialized to snapshots.
 */

import type { SnapshotSerializer } from './types';
import { SnapshotService } from './service';

/**
 * Ingredient data within a snapshot
 */
export interface RecipeSnapshotIngredient {
  ingredientId: string;
  ingredientName: string;
  quantity: number;
  unit: string;
}

/**
 * Section data within a snapshot
 */
export interface RecipeSnapshotSection {
  id: string;
  name: string;
  order: number;
  instructions: string;
  ingredients: RecipeSnapshotIngredient[];
}

/**
 * Complete recipe snapshot data
 */
export interface RecipeSnapshotData {
  id: string;
  name: string;
  description: string | null;
  yieldQty: number;
  yieldUnit: string;
  totalCost: number;
  sections: RecipeSnapshotSection[];
}

/**
 * Recipe entity type for the serializer
 * This matches the structure returned by getRecipeById
 */
export interface RecipeEntity {
  id: string;
  name: string;
  description: string | null;
  yieldQty: number;
  yieldUnit: string;
  totalCost: { toString(): string } | number;
  sections: Array<{
    id: string;
    name: string;
    order: number;
    instructions: string;
    ingredients: Array<{
      id: string;
      quantity: { toString(): string } | number;
      unit: string;
      ingredient: {
        id: string;
        name: string;
        unit: string;
      };
    }>;
  }>;
}

/**
 * Recipe serializer implementation
 */
export const recipeSerializer: SnapshotSerializer<RecipeEntity, RecipeSnapshotData> = {
  entityType: 'recipe',
  currentSchemaVersion: 1,

  serialize(entity: RecipeEntity): RecipeSnapshotData {
    return {
      id: entity.id,
      name: entity.name,
      description: entity.description,
      yieldQty: entity.yieldQty,
      yieldUnit: entity.yieldUnit,
      totalCost:
        typeof entity.totalCost === 'number'
          ? entity.totalCost
          : parseFloat(entity.totalCost.toString()),
      sections: entity.sections.map((section) => ({
        id: section.id,
        name: section.name,
        order: section.order,
        instructions: section.instructions,
        ingredients: section.ingredients.map((ing) => ({
          ingredientId: ing.ingredient.id,
          ingredientName: ing.ingredient.name,
          quantity:
            typeof ing.quantity === 'number'
              ? ing.quantity
              : parseFloat(ing.quantity.toString()),
          unit: ing.unit,
        })),
      })),
    };
  },

  validate(data: unknown): data is RecipeSnapshotData {
    if (!data || typeof data !== 'object') return false;

    const snapshot = data as Record<string, unknown>;

    return (
      typeof snapshot.id === 'string' &&
      typeof snapshot.name === 'string' &&
      (snapshot.description === null || typeof snapshot.description === 'string') &&
      typeof snapshot.yieldQty === 'number' &&
      typeof snapshot.yieldUnit === 'string' &&
      typeof snapshot.totalCost === 'number' &&
      Array.isArray(snapshot.sections)
    );
  },

  migrate(data: unknown, fromVersion: number): RecipeSnapshotData {
    // Currently only version 1, so no migration needed
    // Add migration logic here when schema changes
    if (fromVersion === 1) {
      return data as RecipeSnapshotData;
    }

    throw new Error(`Unknown recipe snapshot version: ${fromVersion}`);
  },
};

/**
 * Pre-configured snapshot service for recipes
 */
export const recipeSnapshotService = new SnapshotService(recipeSerializer);
