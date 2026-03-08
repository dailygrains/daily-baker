# Density-Based Unit Conversion

## Problem

Recipe cost calculations silently return $0 for ingredients where the recipe unit category (mass/volume) doesn't match the inventory display unit category. For example, EVOO stored as g in a recipe but priced per L in inventory. This understates total recipe cost and prevents accurate total weight calculation.

## Solution

Add an optional density field (`g/mL`) to the Ingredient model. When a mass↔volume conversion is needed, use density as the bridge. Ingredients without density continue to work as they do today (return null for cross-category conversions).

## Data Model

Add to `Ingredient` in Prisma schema:

```prisma
densityGramsPerMl  Decimal?  @db.Decimal(10, 4)
```

Nullable. No migration of existing data needed.

## Ingredient Form UX

New optional section "Density (Volume ↔ Weight)" below "Inventory Details":

- Volume unit dropdown: cup, tbsp, tsp, fl oz, mL, L
- Weight input in grams
- Display: "1 [cup ▾] = [128] grams"
- On save: convert to g/mL using `gramsEntered / convertToMl(selectedVolumeUnit)`
- On load: convert from g/mL back to most readable volume unit for display

Helper text: "Optional. Enables accurate cost and weight calculations when recipes use different units than inventory."

## Conversion Logic

Modify `convertQuantity()` signature:

```typescript
convertQuantity(qty, fromUnit, toUnit, densityGramsPerMl?)
```

When cross-category conversion is attempted:
1. No density → return null (current behavior)
2. Density provided → convert source to base unit (g or mL), use density to bridge, convert to target unit

Example: `convertQuantity(960, 'g', 'L', 0.92)` → 960g ÷ 0.92 g/mL = 1043.5 mL → 1.0435 L

## Callers Updated

- `calculateIngredientCost()` — add optional density param, pass to convertQuantity
- `page.tsx` recipe detail — pass density through cost calculation loop
- `getRecipeById()` — include densityGramsPerMl in returned ingredient data
- New total weight calculation in page.tsx — sum all ingredients converted to grams
- `RecipeDetailSidebar` — new "Total Weight" row after "Cost per Unit"

## What Doesn't Change

- Same-category conversions (g→lb, cup→mL): density ignored
- Inventory lot calculations: unaffected
- Recipe form: no changes
- Ingredients without density: same null/N/A behavior
