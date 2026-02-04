/**
 * Production Sheet Snapshot Types (client-safe)
 *
 * These types mirror the types in productionSheetSnapshot.ts
 * but can be safely imported in client components.
 */

// Frozen ingredient data
export interface SnapshotIngredient {
  ingredientId: string;
  ingredientName: string;
  originalQuantity: number;
  scaledQuantity: number;
  unit: string;
}

// Frozen section data
export interface SnapshotSection {
  sectionId: string;
  sectionName: string;
  ingredients: SnapshotIngredient[];
}

// Frozen recipe data
export interface SnapshotRecipe {
  recipeId: string;
  recipeName: string;
  scale: number;
  yieldQty: number;
  yieldUnit: string;
  scaledYieldQty: number;
  totalCost: number;
  sections: SnapshotSection[];
}

// Frozen aggregated ingredient
export interface SnapshotAggregatedIngredient {
  ingredientId: string;
  ingredientName: string;
  totalQuantity: number;
  unit: string;
  contributions: Array<{
    recipeId: string;
    recipeName: string;
    quantity: number;
    unit: string;
  }>;
}

// Complete snapshot structure stored in JSON field
export interface ProductionSheetSnapshot {
  version: 1;
  completedAt: string;
  recipes: SnapshotRecipe[];
  aggregatedIngredients: SnapshotAggregatedIngredient[];
  totalCost: number;
}
