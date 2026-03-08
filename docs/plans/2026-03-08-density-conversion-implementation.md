# Density-Based Unit Conversion Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Add optional density field to ingredients enabling mass↔volume conversion, fixing silent $0 costs and enabling total weight display on recipe detail pages.

**Architecture:** Add `densityGramsPerMl` to Ingredient model. Extend `convertQuantity()` with optional density param to bridge mass↔volume. Update recipe detail page to pass density through cost calculations and compute total weight for the sidebar.

**Tech Stack:** Prisma (migration), TypeScript, React (ingredient form), Next.js server components (recipe detail page)

---

### Task 1: Prisma Schema Migration

**Files:**
- Modify: `prisma/schema.prisma:213-231` (Ingredient model)

**Step 1: Add density field to Ingredient model**

In `prisma/schema.prisma`, add after the `unit` field (line 218):

```prisma
densityGramsPerMl Decimal? @db.Decimal(10, 4) @map("density_grams_per_ml")
```

**Step 2: Run migration**

Run: `npx prisma migrate dev --name add-ingredient-density`
Expected: Migration created and applied successfully.

**Step 3: Verify generated client**

Run: `npx prisma generate`
Expected: Client regenerated with `densityGramsPerMl` field on Ingredient type.

**Step 4: Commit**

```bash
git add prisma/
git commit -m "feat: add densityGramsPerMl field to Ingredient model"
```

---

### Task 2: Unit Conversion Logic

**Files:**
- Modify: `src/lib/unitConvert.ts`

**Step 1: Add helper to detect unit category**

Add this function after the existing `getUnitCategory()` (around line 150):

```typescript
/**
 * Check if a unit is a mass unit
 */
function isMassUnit(unit: string): boolean {
  return getUnitCategory(unit) === 'mass';
}

/**
 * Check if a unit is a volume unit
 */
function isVolumeUnit(unit: string): boolean {
  return getUnitCategory(unit) === 'volume';
}
```

**Step 2: Update `convertQuantity()` signature and add density bridging**

Change the function signature at line 194 to accept optional density:

```typescript
export function convertQuantity(
  quantity: number,
  fromUnit: string,
  toUnit: string,
  densityGramsPerMl?: number | null
): number | null {
```

After the existing `canConvertUnits` check (line 222-225), before the `try` block, add density bridging:

```typescript
  // If units are in different categories, try density-based conversion
  if (!canConvertUnits(fromUnit, toUnit) && densityGramsPerMl) {
    const fromNormalized = normalizeUnit(fromUnit);
    const toNormalized = normalizeUnit(toUnit);
    if (!fromNormalized || !toNormalized) return null;

    const fromIsMass = isMassUnit(fromUnit);
    const fromIsVolume = isVolumeUnit(fromUnit);
    const toIsMass = isMassUnit(toUnit);
    const toIsVolume = isVolumeUnit(toUnit);

    if (fromIsMass && toIsVolume) {
      // mass → grams → mL (via density) → target volume
      const grams = convert(quantity)
        .from(fromNormalized as Parameters<ReturnType<typeof convert>['from']>[0])
        .to('g' as Parameters<ReturnType<typeof convert>['to']>[0]);
      const ml = grams / densityGramsPerMl;
      return convert(ml)
        .from('ml' as Parameters<ReturnType<typeof convert>['from']>[0])
        .to(toNormalized as Parameters<ReturnType<typeof convert>['to']>[0]);
    }

    if (fromIsVolume && toIsMass) {
      // volume → mL → grams (via density) → target mass
      const ml = convert(quantity)
        .from(fromNormalized as Parameters<ReturnType<typeof convert>['from']>[0])
        .to('ml' as Parameters<ReturnType<typeof convert>['to']>[0]);
      const grams = ml * densityGramsPerMl;
      return convert(grams)
        .from('g' as Parameters<ReturnType<typeof convert>['from']>[0])
        .to(toNormalized as Parameters<ReturnType<typeof convert>['to']>[0]);
    }

    return null;
  }
```

Also remove the existing early return for cross-category (lines 222-225) by wrapping it to only return null when density is NOT available:

Replace:
```typescript
  if (!canConvertUnits(fromUnit, toUnit)) {
    console.warn(`Cannot convert between different categories: ${fromUnit} to ${toUnit}`);
    return null;
  }
```

With:
```typescript
  if (!canConvertUnits(fromUnit, toUnit)) {
    // Try density-based cross-category conversion
    if (densityGramsPerMl) {
      const fromNormalized = normalizeUnit(fromUnit);
      const toNormalized = normalizeUnit(toUnit);
      if (!fromNormalized || !toNormalized) return null;

      const fromIsMass = isMassUnit(fromUnit);
      const fromIsVolume = isVolumeUnit(fromUnit);
      const toIsMass = isMassUnit(toUnit);
      const toIsVolume = isVolumeUnit(toUnit);

      try {
        if (fromIsMass && toIsVolume) {
          const grams = convert(quantity)
            .from(fromNormalized as Parameters<ReturnType<typeof convert>['from']>[0])
            .to('g' as Parameters<ReturnType<typeof convert>['to']>[0]);
          const ml = grams / densityGramsPerMl;
          return convert(ml)
            .from('ml' as Parameters<ReturnType<typeof convert>['from']>[0])
            .to(toNormalized as Parameters<ReturnType<typeof convert>['to']>[0]);
        }

        if (fromIsVolume && toIsMass) {
          const ml = convert(quantity)
            .from(fromNormalized as Parameters<ReturnType<typeof convert>['from']>[0])
            .to('ml' as Parameters<ReturnType<typeof convert>['to']>[0]);
          const grams = ml * densityGramsPerMl;
          return convert(grams)
            .from('g' as Parameters<ReturnType<typeof convert>['from']>[0])
            .to(toNormalized as Parameters<ReturnType<typeof convert>['to']>[0]);
        }
      } catch (error) {
        console.warn(`Density-based conversion failed from ${fromUnit} to ${toUnit}:`, error);
        return null;
      }
    }

    return null;
  }
```

**Step 3: Update `calculateIngredientCost()` to accept density**

Change signature at line 269:

```typescript
export function calculateIngredientCost(
  recipeQuantity: number,
  recipeUnit: string,
  costPerUnit: number,
  ingredientUnit: string,
  densityGramsPerMl?: number | null
): number | null {
  const convertedQuantity = convertQuantity(recipeQuantity, recipeUnit, ingredientUnit, densityGramsPerMl);
```

**Step 4: Update `getConversionFactorSync()` to accept density**

Change signature at line 245:

```typescript
export function getConversionFactorSync(
  fromUnit: string,
  toUnit: string,
  densityGramsPerMl?: number | null
): number | null {
  if (fromUnit === toUnit) return 1;
  const result = convertQuantity(1, fromUnit, toUnit, densityGramsPerMl);
  return result;
}
```

**Step 5: Verify type check passes**

Run: `npm run check`
Expected: No type errors.

**Step 6: Commit**

```bash
git add src/lib/unitConvert.ts
git commit -m "feat: add density-based mass/volume conversion to convertQuantity"
```

---

### Task 3: Pass Density Through Recipe Data

**Files:**
- Modify: `src/app/actions/recipe.ts:595-632`
- Modify: `src/app/dashboard/recipes/[id]/page.tsx:35-49`
- Modify: `src/components/recipes/RecipeDetailContent.tsx:6-23`

**Step 1: Include densityGramsPerMl in getRecipeById return**

In `src/app/actions/recipe.ts`, in the `transformedRecipe` mapping (line 621-628), add `densityGramsPerMl`:

```typescript
          return {
            ...ing,
            ingredient: {
              id: ing.ingredient.id,
              name: ing.ingredient.name,
              unit: ing.ingredient.inventory?.displayUnit ?? ing.ingredient.unit,
              costPerUnit: costPerUnit,
              densityGramsPerMl: ing.ingredient.densityGramsPerMl
                ? Number(ing.ingredient.densityGramsPerMl)
                : null,
            },
          };
```

**Step 2: Pass density through cost calculation in page.tsx**

In `src/app/dashboard/recipes/[id]/page.tsx`, update the cost calculation loop (lines 36-46):

```typescript
  const totalCost = recipe.sections.reduce((sectionSum, section) => {
    return sectionSum + section.ingredients.reduce((ingSum, ing) => {
      const cost = calculateIngredientCost(
        Number(ing.quantity),
        ing.unit,
        Number(ing.ingredient.costPerUnit),
        ing.ingredient.unit,
        ing.ingredient.densityGramsPerMl ?? undefined
      );
      return ingSum + (cost ?? 0);
    }, 0);
  }, 0);
```

**Step 3: Add total weight calculation in page.tsx**

After the `totalIngredients` calculation (line 52-55), add:

```typescript
  // Calculate total weight in grams
  const { totalWeightGrams, unconvertedCount } = recipe.sections.reduce(
    (acc, section) => {
      for (const ing of section.ingredients) {
        const qty = Number(ing.quantity);
        const weightInGrams = convertQuantity(
          qty,
          ing.unit,
          'g',
          ing.ingredient.densityGramsPerMl ?? undefined
        );
        if (weightInGrams !== null) {
          acc.totalWeightGrams += weightInGrams;
        } else {
          acc.unconvertedCount++;
        }
      }
      return acc;
    },
    { totalWeightGrams: 0, unconvertedCount: 0 }
  );
```

Add the import for `convertQuantity` at the top of the file:

```typescript
import { calculateIngredientCost, convertQuantity } from '@/lib/unitConvert';
```

**Step 4: Pass weight data to sidebar**

Update the `RecipeDetailSidebar` props in page.tsx:

```tsx
          <RecipeDetailSidebar
            recipe={recipe}
            totalCost={totalCost}
            costPerUnit={costPerUnit}
            totalIngredients={totalIngredients}
            totalWeightGrams={totalWeightGrams}
            unconvertedCount={unconvertedCount}
            tags={tags}
          />
```

**Step 5: Update RecipeDetailContent ingredient interface**

In `src/components/recipes/RecipeDetailContent.tsx`, add `densityGramsPerMl` to the ingredient interface (line 17-22):

```typescript
    ingredient: {
      id: string;
      name: string;
      unit: string;
      costPerUnit: number;
      densityGramsPerMl?: number | null;
    };
```

Update the cost calculation call (lines 94-99) to pass density:

```typescript
                      const totalIngredientCost = calculateIngredientCost(
                        quantity,
                        recipeUnit,
                        unitCost,
                        ingredientUnit,
                        ing.ingredient.densityGramsPerMl ?? undefined
                      );
```

**Step 6: Verify type check**

Run: `npm run check`
Expected: Errors for RecipeDetailSidebar missing props (fixed in next task).

**Step 7: Commit**

```bash
git add src/app/actions/recipe.ts src/app/dashboard/recipes/[id]/page.tsx src/components/recipes/RecipeDetailContent.tsx
git commit -m "feat: pass ingredient density through recipe cost and weight calculations"
```

---

### Task 4: Recipe Detail Sidebar — Total Weight Display

**Files:**
- Modify: `src/components/recipes/RecipeDetailSidebar.tsx`
- Modify: `src/lib/format.ts`

**Step 1: Add `formatWeight` to format.ts**

In `src/lib/format.ts`, add:

```typescript
/**
 * Format a weight in grams to a human-readable string.
 * Uses g for values under 1000, kg for 1000+.
 * @param grams - Weight in grams
 * @returns Formatted weight string with unit
 */
export function formatWeight(grams: number): string {
  if (grams >= 1000) {
    const kg = grams / 1000;
    return `${formatQuantity(kg, 2)} kg`;
  }
  return `${formatQuantity(grams, 1)} g`;
}
```

**Step 2: Update RecipeDetailSidebar props and display**

In `src/components/recipes/RecipeDetailSidebar.tsx`, add to the interface (after `totalIngredients`):

```typescript
  totalWeightGrams: number;
  unconvertedCount: number;
```

Add to the destructured props:

```typescript
export function RecipeDetailSidebar({
  recipe,
  totalCost,
  costPerUnit,
  totalIngredients,
  totalWeightGrams,
  unconvertedCount,
  tags = [],
}: RecipeDetailSidebarProps) {
```

Add the import at the top:

```typescript
import { formatCurrency, formatWeight } from '@/lib/format';
```

Remove the existing `formatCurrency` import if it's from a different path.

Add the Total Weight row after the "Cost per Unit" row (after line 63):

```tsx
            {totalWeightGrams > 0 && (
              <div className="flex justify-between items-center">
                <span className="text-sm text-base-content/70">Total Weight</span>
                <span className="font-semibold">
                  {formatWeight(totalWeightGrams)}
                  {unconvertedCount > 0 && (
                    <span className="text-xs text-base-content/50 ml-1">
                      *
                    </span>
                  )}
                </span>
              </div>
            )}
            {unconvertedCount > 0 && totalWeightGrams > 0 && (
              <p className="text-xs text-base-content/50">
                * Excludes {unconvertedCount} ingredient{unconvertedCount > 1 ? 's' : ''} without density data
              </p>
            )}
```

**Step 3: Verify type check**

Run: `npm run check`
Expected: No type errors.

**Step 4: Commit**

```bash
git add src/components/recipes/RecipeDetailSidebar.tsx src/lib/format.ts
git commit -m "feat: display total weight in recipe detail sidebar"
```

---

### Task 5: Ingredient Validation & Server Actions

**Files:**
- Modify: `src/lib/validations/ingredient.ts`
- Modify: `src/app/actions/ingredient.ts:72-140` (createIngredient)
- Modify: `src/app/actions/ingredient.ts:142-240` (updateIngredient)

**Step 1: Add density to validation schemas**

In `src/lib/validations/ingredient.ts`, add to `createIngredientSchema`:

```typescript
export const createIngredientSchema = z.object({
  bakeryId: z.string().cuid(),
  name: z.string().min(1, 'Ingredient name is required').max(100),
  unit: z.string().min(1, 'Unit is required').max(20),
  densityGramsPerMl: z.number().positive().nullable().optional(),
});
```

Add to `updateIngredientSchema`:

```typescript
export const updateIngredientSchema = z.object({
  id: z.string().cuid(),
  name: z.string().min(1, 'Ingredient name is required').max(100).optional(),
  unit: z.string().min(1, 'Unit is required').max(20).optional(),
  lowStockThreshold: z.number().min(0).nullable().optional(),
  densityGramsPerMl: z.number().positive().nullable().optional(),
});
```

**Step 2: Update createIngredient action**

In `src/app/actions/ingredient.ts`, update the `db.ingredient.create` call (line 94-99):

```typescript
    const ingredient = await db.ingredient.create({
      data: {
        bakeryId: validatedData.bakeryId,
        name: validatedData.name,
        unit: validatedData.unit,
        densityGramsPerMl: validatedData.densityGramsPerMl ?? null,
      },
```

**Step 3: Update updateIngredient action**

In `src/app/actions/ingredient.ts`, the `updateData` destructuring at line 182 already spreads remaining validated fields into the update. Since `densityGramsPerMl` is in the schema, it will be included automatically. But verify the destructure excludes only `id` and `lowStockThreshold`:

```typescript
    const { id, lowStockThreshold, ...updateData } = validatedData;
```

This is correct — `densityGramsPerMl` will be in `updateData` and passed to `db.ingredient.update`.

**Step 4: Verify type check**

Run: `npm run check`
Expected: No type errors.

**Step 5: Commit**

```bash
git add src/lib/validations/ingredient.ts src/app/actions/ingredient.ts
git commit -m "feat: add density field to ingredient validation and server actions"
```

---

### Task 6: Ingredient Form — Density Input

**Files:**
- Modify: `src/components/ingredients/IngredientForm.tsx`

**Step 1: Add density to form props interface**

Update the `ingredient` prop type (line 32-43) to include density:

```typescript
  ingredient?: {
    id: string;
    name: string;
    currentQty: number | string | Decimal;
    unit: string;
    costPerUnit: number | string | Decimal;
    lowStockThreshold: number | null;
    densityGramsPerMl: number | string | Decimal | null;
    vendors: Array<{
      vendor: Vendor;
    }>;
    tags?: Tag[];
  };
```

**Step 2: Add density state management**

Add helper constants at top of the component (after line 61), before formRef:

```typescript
  // Density conversion helpers
  const VOLUME_UNITS = [
    { value: 'cup', label: 'Cup', mlFactor: 236.588 },
    { value: 'tbsp', label: 'Tablespoon', mlFactor: 14.787 },
    { value: 'tsp', label: 'Teaspoon', mlFactor: 4.929 },
    { value: 'fl-oz', label: 'Fluid Ounce', mlFactor: 29.574 },
    { value: 'ml', label: 'Milliliter', mlFactor: 1 },
    { value: 'l', label: 'Liter', mlFactor: 1000 },
  ];
```

Initialize density display state. Derive the initial display values from the stored g/mL:

```typescript
  // Convert stored density (g/mL) to display values for the form
  const storedDensity = ingredient?.densityGramsPerMl
    ? Number(ingredient.densityGramsPerMl)
    : null;

  const getInitialDensityDisplay = () => {
    if (!storedDensity) return { volumeUnit: 'cup', weightGrams: '' };
    // Default display as "per cup"
    const cupMl = 236.588;
    return {
      volumeUnit: 'cup',
      weightGrams: String(Math.round(storedDensity * cupMl * 100) / 100),
    };
  };

  const [densityVolumeUnit, setDensityVolumeUnit] = useState(
    getInitialDensityDisplay().volumeUnit
  );
  const [densityWeightGrams, setDensityWeightGrams] = useState(
    getInitialDensityDisplay().weightGrams
  );
```

**Step 3: Add density conversion to formData**

Update `formData` state (line 76-82) to include density:

```typescript
  const [formData, setFormData] = useState({
    name: ingredient?.name ?? '',
    currentQty: ingredient ? Number(ingredient.currentQty) : 0,
    unit: ingredient?.unit ?? '',
    costPerUnit: ingredient ? Number(ingredient.costPerUnit) : 0,
    lowStockThreshold: ingredient?.lowStockThreshold ?? null as number | null,
    densityGramsPerMl: storedDensity,
  });
```

**Step 4: Add density section to the form JSX**

After the "Inventory Details" section closing `</div>` (after line 308), add:

```tsx
      <div className="space-y-0">
        <h2 className="text-xl font-semibold">Density (Volume ↔ Weight)</h2>

        <fieldset className="fieldset">
          <legend className="fieldset-legend">Volume-to-Weight Equivalence</legend>
          <div className="flex items-center gap-3">
            <span className="text-sm font-medium whitespace-nowrap">1</span>
            <select
              className="select select-bordered"
              value={densityVolumeUnit}
              onChange={(e) => {
                const newUnit = e.target.value;
                setDensityVolumeUnit(newUnit);
                // Recalculate displayed grams for the new volume unit
                if (formData.densityGramsPerMl) {
                  const mlFactor = VOLUME_UNITS.find(u => u.value === newUnit)?.mlFactor ?? 1;
                  const newGrams = formData.densityGramsPerMl * mlFactor;
                  setDensityWeightGrams(String(Math.round(newGrams * 100) / 100));
                }
              }}
            >
              {VOLUME_UNITS.map(u => (
                <option key={u.value} value={u.value}>{u.label}</option>
              ))}
            </select>
            <span className="text-sm font-medium">=</span>
            <input
              type="number"
              step="0.01"
              min="0"
              className="input input-bordered w-32"
              value={densityWeightGrams}
              onChange={(e) => {
                const grams = e.target.value;
                setDensityWeightGrams(grams);
                setHasUnsavedChanges(true);
                // Convert to g/mL for storage
                const gramsNum = parseFloat(grams);
                if (grams === '' || isNaN(gramsNum) || gramsNum <= 0) {
                  setFormData(prev => ({ ...prev, densityGramsPerMl: null }));
                } else {
                  const mlFactor = VOLUME_UNITS.find(u => u.value === densityVolumeUnit)?.mlFactor ?? 1;
                  setFormData(prev => ({ ...prev, densityGramsPerMl: gramsNum / mlFactor }));
                }
              }}
              placeholder="e.g., 128"
            />
            <span className="text-sm font-medium">grams</span>
          </div>
          <label className="label">
            <span className="label-text-alt">
              Optional. Enables accurate cost and weight calculations when recipes use different units than inventory.
            </span>
          </label>
        </fieldset>
      </div>
```

**Step 5: Verify type check**

Run: `npm run check`
Expected: No type errors.

**Step 6: Commit**

```bash
git add src/components/ingredients/IngredientForm.tsx
git commit -m "feat: add density input to ingredient form"
```

---

### Task 7: Wire Density Into Ingredient Detail/Edit Pages

**Files:**
- Check: `src/app/dashboard/ingredients/[id]/edit/page.tsx` — verify it passes `densityGramsPerMl` to IngredientForm
- Check: `src/app/actions/ingredient.ts` — verify `getIngredients` / `getIngredientById` returns density

**Step 1: Check ingredient fetch actions return density**

Search for the ingredient fetch functions and verify they include `densityGramsPerMl` in the returned data. Prisma includes all scalar fields by default, so this should work automatically. Verify the intermediate transforms don't strip it.

**Step 2: Check the edit page passes density to the form**

In the edit page, verify the ingredient data passed to `IngredientForm` includes `densityGramsPerMl`. If the data is transformed before being passed, ensure density is preserved.

**Step 3: Verify full flow**

Run: `npm run check`
Run: `npm run dev` — navigate to an ingredient edit page, verify density field appears.
Expected: Density section visible, can enter and save values.

**Step 4: Commit if any changes needed**

```bash
git add -A
git commit -m "feat: wire density through ingredient edit pages"
```

---

### Task 8: Manual Verification & Cleanup

**Step 1: Run full type check and lint**

Run: `npm run check`
Expected: Clean pass.

**Step 2: Test the full flow locally**

1. Start dev server: `npm run dev`
2. Edit an ingredient (e.g., EVOO) → set density (1 cup = 216g for olive oil)
3. View a recipe using that ingredient → verify cost now shows instead of N/A
4. Verify Total Weight appears in sidebar
5. Verify ingredients without density still show N/A cost (unchanged behavior)

**Step 3: Clean up temp files**

Run: `rm /tmp/granola-calc.js` if it exists.

**Step 4: Final commit**

```bash
git add -A
git commit -m "feat: density-based unit conversion complete"
```
