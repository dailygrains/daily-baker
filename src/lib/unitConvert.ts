import convert from 'convert-units';

/**
 * Unit conversion utility using convert-units library (v2.x)
 * Provides synchronous unit conversion for mass and volume measurements
 */

// Map our unit strings to convert-units unit abbreviations
// This handles variations and aliases
const unitMap: Record<string, string | null> = {
  // Mass units
  'g': 'g',
  'gram': 'g',
  'grams': 'g',
  'kg': 'kg',
  'kilogram': 'kg',
  'kilograms': 'kg',
  'lb': 'lb',
  'lbs': 'lb',
  'pound': 'lb',
  'pounds': 'lb',
  'oz': 'oz',
  'ounce': 'oz',
  'ounces': 'oz',
  'mg': 'mg',
  'milligram': 'mg',
  'milligrams': 'mg',

  // Volume units
  'ml': 'ml',
  'mL': 'ml',
  'milliliter': 'ml',
  'milliliters': 'ml',
  'millilitre': 'ml',
  'millilitres': 'ml',
  'l': 'l',
  'L': 'l',
  'liter': 'l',
  'liters': 'l',
  'litre': 'l',
  'litres': 'l',
  'cup': 'cup',
  'cups': 'cup',
  'tbsp': 'Tbs',
  'Tbsp': 'Tbs',
  'Tbs': 'Tbs',
  'tablespoon': 'Tbs',
  'tablespoons': 'Tbs',
  'tsp': 'tsp',
  'Tsp': 'tsp',
  'teaspoon': 'tsp',
  'teaspoons': 'tsp',
  'fl-oz': 'fl-oz',
  'fl oz': 'fl-oz',
  'fluid ounce': 'fl-oz',
  'fluid ounces': 'fl-oz',
  'gal': 'gal',
  'gallon': 'gal',
  'gallons': 'gal',
  'qt': 'qt',
  'quart': 'qt',
  'quarts': 'qt',
  'pnt': 'pnt',
  'pint': 'pnt',
  'pints': 'pnt',

  // Non-convertible units (count-based)
  'unit': null,
  'units': null,
  'each': null,
  'ea': null,
  'piece': null,
  'pieces': null,
  'pc': null,
  'pcs': null,
};

/**
 * Normalize a unit string to its convert-units abbreviation
 * Returns null for non-convertible units (like "unit" for counting)
 */
export function normalizeUnit(unit: string): string | null {
  // Check direct mapping first (preserves case for things like 'mL' -> 'ml')
  if (unit in unitMap) {
    return unitMap[unit];
  }

  // Check lowercase mapping
  const normalized = unit.toLowerCase().trim();
  if (normalized in unitMap) {
    return unitMap[normalized];
  }

  // Try the unit directly with convert-units (in case it's already valid)
  try {
    const desc = convert().describe(unit as Parameters<ReturnType<typeof convert>['describe']>[0]);
    if (desc) {
      return unit;
    }
  } catch {
    // Not a valid unit
  }

  return null;
}

/**
 * Get the category (measure type) of a unit
 * Returns 'mass', 'volume', or null for unknown/count units
 */
export function getUnitCategory(unit: string): string | null {
  const normalizedUnit = normalizeUnit(unit);
  if (!normalizedUnit) return null;

  try {
    const desc = convert().describe(normalizedUnit as Parameters<ReturnType<typeof convert>['describe']>[0]);
    return desc?.measure ?? null;
  } catch {
    return null;
  }
}

/**
 * Check if two units can be converted between each other
 * Units must be in the same category (both mass or both volume)
 */
export function canConvertUnits(fromUnit: string, toUnit: string): boolean {
  // Same unit - always convertible
  if (fromUnit === toUnit) return true;

  const fromNormalized = normalizeUnit(fromUnit);
  const toNormalized = normalizeUnit(toUnit);

  // If either unit is non-convertible (like "unit"), can only convert if they're the same
  if (!fromNormalized || !toNormalized) {
    return fromUnit.toLowerCase() === toUnit.toLowerCase();
  }

  // Check if both units are in the same category
  const fromCategory = getUnitCategory(fromUnit);
  const toCategory = getUnitCategory(toUnit);

  return fromCategory !== null && fromCategory === toCategory;
}

/**
 * Convert a quantity from one unit to another
 * Returns the converted value, or null if conversion is not possible
 *
 * @param quantity - The amount to convert
 * @param fromUnit - The source unit (e.g., 'g', 'kg', 'mL')
 * @param toUnit - The target unit (e.g., 'kg', 'g', 'L')
 * @returns The converted quantity, or null if conversion failed
 *
 * @example
 * convertQuantity(700, 'g', 'kg') // Returns 0.7
 * convertQuantity(1, 'cup', 'ml') // Returns ~236.588
 * convertQuantity(5, 'unit', 'unit') // Returns 5
 */
export function convertQuantity(
  quantity: number,
  fromUnit: string,
  toUnit: string
): number | null {
  // Same unit - no conversion needed
  if (fromUnit === toUnit) return quantity;

  const fromNormalized = normalizeUnit(fromUnit);
  const toNormalized = normalizeUnit(toUnit);

  // Handle non-convertible units (count-based like "unit", "each")
  if (!fromNormalized || !toNormalized) {
    // If both are the same non-convertible unit type, just return the quantity
    if (fromUnit.toLowerCase() === toUnit.toLowerCase()) {
      return quantity;
    }
    // Cannot convert between different non-convertible units
    console.warn(`Cannot convert between non-convertible units: ${fromUnit} to ${toUnit}`);
    return null;
  }

  // Check if units are in the same category
  if (!canConvertUnits(fromUnit, toUnit)) {
    console.warn(`Cannot convert between different categories: ${fromUnit} to ${toUnit}`);
    return null;
  }

  try {
    return convert(quantity)
      .from(fromNormalized as Parameters<ReturnType<typeof convert>['from']>[0])
      .to(toNormalized as Parameters<ReturnType<typeof convert>['to']>[0]);
  } catch (error) {
    console.warn(`Conversion failed from ${fromUnit} to ${toUnit}:`, error);
    return null;
  }
}

/**
 * Get the conversion factor between two units
 * Returns the factor to multiply by, or null if conversion is not possible
 *
 * @example
 * getConversionFactorSync('g', 'kg') // Returns 0.001
 * getConversionFactorSync('kg', 'g') // Returns 1000
 */
export function getConversionFactorSync(
  fromUnit: string,
  toUnit: string
): number | null {
  if (fromUnit === toUnit) return 1;

  // Get the factor by converting 1 unit
  const result = convertQuantity(1, fromUnit, toUnit);
  return result;
}

/**
 * Calculate ingredient cost with proper unit conversion
 *
 * @param recipeQuantity - The quantity used in the recipe
 * @param recipeUnit - The unit used in the recipe (e.g., 'g')
 * @param costPerUnit - The cost per unit of the ingredient
 * @param ingredientUnit - The unit the cost is based on (e.g., 'kg')
 * @returns The calculated cost, or null if conversion failed
 *
 * @example
 * // 700g of flour at $2.50/kg
 * calculateIngredientCost(700, 'g', 2.50, 'kg') // Returns 1.75
 */
export function calculateIngredientCost(
  recipeQuantity: number,
  recipeUnit: string,
  costPerUnit: number,
  ingredientUnit: string
): number | null {
  // Convert recipe quantity to ingredient's unit
  const convertedQuantity = convertQuantity(recipeQuantity, recipeUnit, ingredientUnit);

  if (convertedQuantity === null) {
    return null;
  }

  return convertedQuantity * costPerUnit;
}

/**
 * Format a unit for display (handles common abbreviations)
 */
export function formatUnit(unit: string): string {
  const displayMap: Record<string, string> = {
    'g': 'g',
    'kg': 'kg',
    'mg': 'mg',
    'lb': 'lb',
    'oz': 'oz',
    'ml': 'mL',
    'l': 'L',
    'cup': 'cup',
    'Tbs': 'tbsp',
    'tsp': 'tsp',
    'fl-oz': 'fl oz',
    'gal': 'gal',
    'qt': 'qt',
    'pnt': 'pint',
  };

  const normalized = normalizeUnit(unit);
  if (normalized && normalized in displayMap) {
    return displayMap[normalized];
  }

  return unit;
}

/**
 * Get all available units for a category
 */
export function getUnitsForCategory(category: 'mass' | 'volume'): string[] {
  try {
    return convert().possibilities(category);
  } catch {
    return [];
  }
}
