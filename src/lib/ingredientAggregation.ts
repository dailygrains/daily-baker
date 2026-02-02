/**
 * Ingredient aggregation utilities for multi-recipe production sheets
 * Handles scaling and combining ingredients across multiple recipes
 */

import { Decimal } from '@prisma/client/runtime/library';
import { convertQuantity } from './unitConvert';

// Type that accepts both Decimal and number
type NumericValue = Decimal | number | { toNumber: () => number };

// Helper to convert any numeric value to number
function toNumber(value: NumericValue): number {
  if (typeof value === 'number') return value;
  if (typeof value === 'object' && 'toNumber' in value) return value.toNumber();
  return Number(value);
}

// Recipe ingredient from Prisma includes
export interface RecipeIngredient {
  id: string;
  quantity: NumericValue;
  unit: string;
  ingredient: {
    id: string;
    name: string;
    unit: string;
  };
}

// Recipe section from Prisma includes
export interface RecipeSection {
  id: string;
  name: string;
  order: number;
  ingredients: RecipeIngredient[];
}

// Full recipe with sections
export interface RecipeWithSections {
  id: string;
  name: string;
  yieldQty: number;
  yieldUnit: string;
  totalCost: NumericValue;
  sections: RecipeSection[];
}

// Recipe entry on a production sheet
export interface ProductionSheetRecipeEntry {
  id: string;
  scale: NumericValue;
  order: number;
  recipe: RecipeWithSections;
}

// Scaled ingredient result
export interface ScaledIngredient {
  ingredientId: string;
  ingredientName: string;
  ingredientUnit: string;
  originalQuantity: number;
  scaledQuantity: number;
  recipeUnit: string;
  sectionId: string;
  sectionName: string;
}

// Ingredient grouped by recipe for display
export interface RecipeScaledIngredients {
  recipeId: string;
  recipeName: string;
  scale: number;
  yieldQty: number;
  yieldUnit: string;
  scaledYieldQty: number;
  estimatedCost: number;
  sections: Array<{
    sectionId: string;
    sectionName: string;
    ingredients: ScaledIngredient[];
  }>;
}

// Aggregated ingredient across all recipes
export interface AggregatedIngredient {
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

/**
 * Calculate scaled ingredients for a single recipe
 */
export function calculateScaledIngredients(
  recipe: RecipeWithSections,
  scale: number
): RecipeScaledIngredients {
  const sections: RecipeScaledIngredients['sections'] = [];

  for (const section of recipe.sections) {
    const ingredients: ScaledIngredient[] = [];

    for (const recipeIngredient of section.ingredients) {
      const originalQty = toNumber(recipeIngredient.quantity);
      const scaledQty = originalQty * scale;

      ingredients.push({
        ingredientId: recipeIngredient.ingredient.id,
        ingredientName: recipeIngredient.ingredient.name,
        ingredientUnit: recipeIngredient.ingredient.unit,
        originalQuantity: originalQty,
        scaledQuantity: scaledQty,
        recipeUnit: recipeIngredient.unit,
        sectionId: section.id,
        sectionName: section.name,
      });
    }

    sections.push({
      sectionId: section.id,
      sectionName: section.name,
      ingredients,
    });
  }

  const recipeCost = toNumber(recipe.totalCost);

  return {
    recipeId: recipe.id,
    recipeName: recipe.name,
    scale,
    yieldQty: recipe.yieldQty,
    yieldUnit: recipe.yieldUnit,
    scaledYieldQty: recipe.yieldQty * scale,
    estimatedCost: recipeCost * scale,
    sections,
  };
}

/**
 * Calculate scaled ingredients for all recipes on a production sheet
 */
export function calculateAllScaledIngredients(
  recipes: ProductionSheetRecipeEntry[]
): RecipeScaledIngredients[] {
  return recipes
    .sort((a, b) => a.order - b.order)
    .map((entry) =>
      calculateScaledIngredients(entry.recipe, toNumber(entry.scale))
    );
}

/**
 * Aggregate ingredients across all recipes
 * Combines same ingredients and converts to a common unit (ingredient's base unit)
 */
export function aggregateIngredients(
  recipeIngredients: RecipeScaledIngredients[]
): AggregatedIngredient[] {
  // Map: ingredientId -> aggregated data
  const aggregated = new Map<string, AggregatedIngredient>();

  for (const recipe of recipeIngredients) {
    for (const section of recipe.sections) {
      for (const ingredient of section.ingredients) {
        const existing = aggregated.get(ingredient.ingredientId);

        // Convert to ingredient's base unit for aggregation
        let quantityInBaseUnit = ingredient.scaledQuantity;
        if (ingredient.recipeUnit !== ingredient.ingredientUnit) {
          const converted = convertQuantity(
            ingredient.scaledQuantity,
            ingredient.recipeUnit,
            ingredient.ingredientUnit
          );
          if (converted !== null) {
            quantityInBaseUnit = converted;
          } else {
            // If conversion fails, keep original (will show in recipe's unit)
            console.warn(
              `Cannot convert ${ingredient.scaledQuantity} ${ingredient.recipeUnit} to ${ingredient.ingredientUnit} for ${ingredient.ingredientName}`
            );
          }
        }

        const contribution = {
          recipeId: recipe.recipeId,
          recipeName: recipe.recipeName,
          quantity: ingredient.scaledQuantity,
          unit: ingredient.recipeUnit,
        };

        if (existing) {
          existing.totalQuantity += quantityInBaseUnit;
          existing.contributions.push(contribution);
        } else {
          aggregated.set(ingredient.ingredientId, {
            ingredientId: ingredient.ingredientId,
            ingredientName: ingredient.ingredientName,
            totalQuantity: quantityInBaseUnit,
            unit: ingredient.ingredientUnit,
            contributions: [contribution],
          });
        }
      }
    }
  }

  // Sort alphabetically by ingredient name
  return Array.from(aggregated.values()).sort((a, b) =>
    a.ingredientName.localeCompare(b.ingredientName)
  );
}

/**
 * Get all ingredients from a production sheet with their scaled quantities
 * Used for inventory checking and FIFO deduction
 */
export function getProductionSheetIngredientRequirements(
  recipes: ProductionSheetRecipeEntry[]
): Array<{
  ingredientId: string;
  ingredientName: string;
  requiredQuantity: number;
  requiredUnit: string;
}> {
  const requirements = new Map<
    string,
    {
      ingredientId: string;
      ingredientName: string;
      requiredQuantity: number;
      requiredUnit: string;
    }
  >();

  for (const entry of recipes) {
    const scale = toNumber(entry.scale);

    for (const section of entry.recipe.sections) {
      for (const recipeIngredient of section.ingredients) {
        const ingredientId = recipeIngredient.ingredient.id;
        const scaledQty = toNumber(recipeIngredient.quantity) * scale;
        const unit = recipeIngredient.unit;

        const existing = requirements.get(ingredientId);

        if (existing) {
          // Convert to same unit if possible, then add
          if (existing.requiredUnit === unit) {
            existing.requiredQuantity += scaledQty;
          } else {
            // Try to convert to existing unit
            const converted = convertQuantity(scaledQty, unit, existing.requiredUnit);
            if (converted !== null) {
              existing.requiredQuantity += converted;
            } else {
              // If can't convert, use ingredient's base unit
              const baseUnit = recipeIngredient.ingredient.unit;
              const existingConverted = convertQuantity(
                existing.requiredQuantity,
                existing.requiredUnit,
                baseUnit
              );
              const newConverted = convertQuantity(scaledQty, unit, baseUnit);

              if (existingConverted !== null && newConverted !== null) {
                existing.requiredQuantity = existingConverted + newConverted;
                existing.requiredUnit = baseUnit;
              } else {
                // Last resort: just add (may be wrong units but better than nothing)
                console.warn(
                  `Cannot combine units ${existing.requiredUnit} and ${unit} for ${recipeIngredient.ingredient.name}`
                );
                existing.requiredQuantity += scaledQty;
              }
            }
          }
        } else {
          requirements.set(ingredientId, {
            ingredientId,
            ingredientName: recipeIngredient.ingredient.name,
            requiredQuantity: scaledQty,
            requiredUnit: unit,
          });
        }
      }
    }
  }

  return Array.from(requirements.values());
}

/**
 * Calculate total estimated cost for a production sheet
 */
export function calculateTotalCost(recipes: ProductionSheetRecipeEntry[]): number {
  return recipes.reduce((total, entry) => {
    const recipeCost = toNumber(entry.recipe.totalCost);
    const scale = toNumber(entry.scale);
    return total + recipeCost * scale;
  }, 0);
}
