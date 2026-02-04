/**
 * Recipe Snapshot Types (client-safe)
 *
 * These types can be safely imported in client components.
 */

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
