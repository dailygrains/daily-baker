/**
 * Production Sheet Snapshot Types and Utilities
 *
 * When a production sheet is completed, we freeze all calculated values
 * so that future changes to recipes don't affect historical data.
 */

import {
  calculateAllScaledIngredients,
  aggregateIngredients,
  calculateTotalCost,
  type ProductionSheetRecipeEntry,
  type RecipeScaledIngredients,
  type AggregatedIngredient,
} from './ingredientAggregation';

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

/**
 * Create a snapshot from production sheet recipe entries
 * Call this when completing a production sheet
 */
export function createProductionSheetSnapshot(
  recipeEntries: ProductionSheetRecipeEntry[]
): ProductionSheetSnapshot {
  // Calculate all scaled ingredients
  const scaledRecipes = calculateAllScaledIngredients(recipeEntries);

  // Aggregate ingredients across all recipes
  const aggregated = aggregateIngredients(scaledRecipes);

  // Calculate total cost
  const totalCost = calculateTotalCost(recipeEntries);

  // Convert to snapshot format
  const recipes: SnapshotRecipe[] = scaledRecipes.map((recipe) => ({
    recipeId: recipe.recipeId,
    recipeName: recipe.recipeName,
    scale: recipe.scale,
    yieldQty: recipe.yieldQty,
    yieldUnit: recipe.yieldUnit,
    scaledYieldQty: recipe.scaledYieldQty,
    totalCost: recipe.estimatedCost,
    sections: recipe.sections.map((section) => ({
      sectionId: section.sectionId,
      sectionName: section.sectionName,
      ingredients: section.ingredients.map((ing) => ({
        ingredientId: ing.ingredientId,
        ingredientName: ing.ingredientName,
        originalQuantity: ing.originalQuantity,
        scaledQuantity: ing.scaledQuantity,
        unit: ing.recipeUnit,
      })),
    })),
  }));

  const aggregatedIngredients: SnapshotAggregatedIngredient[] = aggregated.map((agg) => ({
    ingredientId: agg.ingredientId,
    ingredientName: agg.ingredientName,
    totalQuantity: agg.totalQuantity,
    unit: agg.unit,
    contributions: agg.contributions,
  }));

  return {
    version: 1,
    completedAt: new Date().toISOString(),
    recipes,
    aggregatedIngredients,
    totalCost,
  };
}

/**
 * Convert snapshot recipes to the format expected by display components
 */
export function snapshotToScaledIngredients(
  snapshot: ProductionSheetSnapshot
): RecipeScaledIngredients[] {
  return snapshot.recipes.map((recipe) => ({
    recipeId: recipe.recipeId,
    recipeName: recipe.recipeName,
    scale: recipe.scale,
    yieldQty: recipe.yieldQty,
    yieldUnit: recipe.yieldUnit,
    scaledYieldQty: recipe.scaledYieldQty,
    estimatedCost: recipe.totalCost,
    sections: recipe.sections.map((section) => ({
      sectionId: section.sectionId,
      sectionName: section.sectionName,
      ingredients: section.ingredients.map((ing) => ({
        ingredientId: ing.ingredientId,
        ingredientName: ing.ingredientName,
        ingredientUnit: ing.unit, // Use the recipe unit as base since that's what we stored
        originalQuantity: ing.originalQuantity,
        scaledQuantity: ing.scaledQuantity,
        recipeUnit: ing.unit,
        sectionId: section.sectionId,
        sectionName: section.sectionName,
      })),
    })),
  }));
}

/**
 * Convert snapshot aggregated ingredients to the format expected by display components
 */
export function snapshotToAggregatedIngredients(
  snapshot: ProductionSheetSnapshot
): AggregatedIngredient[] {
  return snapshot.aggregatedIngredients.map((agg) => ({
    ingredientId: agg.ingredientId,
    ingredientName: agg.ingredientName,
    totalQuantity: agg.totalQuantity,
    unit: agg.unit,
    contributions: agg.contributions,
  }));
}

/**
 * Type guard to check if data is a valid ProductionSheetSnapshot
 */
export function isValidSnapshot(data: unknown): data is ProductionSheetSnapshot {
  if (!data || typeof data !== 'object') return false;

  const snapshot = data as Record<string, unknown>;

  return (
    snapshot.version === 1 &&
    typeof snapshot.completedAt === 'string' &&
    Array.isArray(snapshot.recipes) &&
    Array.isArray(snapshot.aggregatedIngredients) &&
    typeof snapshot.totalCost === 'number'
  );
}
