import { asA, asB, ok, unique } from './client';

type Api = ReturnType<typeof asA>;

export async function makeIngredient(api: Api = asA(), unit = 'g') {
  return ok<{ id: string; name: string }>(
    await api.post('/ingredients', { name: unique('Test flour'), unit })
  );
}

/** A recipe with one section and the given ingredient lines (grams). */
export function recipeBody(lines: { ingredientId: string; quantity: number }[], name = unique('Test recipe')) {
  return {
    name,
    yieldQty: 1,
    yieldUnit: 'batch',
    sections: [
      {
        name: 'Dough',
        order: 0,
        instructions: '- Mix',
        ingredients: lines.map((l, i) => ({ ...l, unit: 'g', order: i })),
      },
    ],
  };
}

export async function makeRecipe(api: Api = asA()) {
  const ingredient = await makeIngredient(api);
  const recipe = ok<{ id: string; name: string }>(
    await api.post('/recipes', recipeBody([{ ingredientId: ingredient.id, quantity: 500 }]))
  );
  return { recipe, ingredient };
}

export { asA, asB };

export async function makeSupply(api: Api = asA(), costPerUnit = 0.25) {
  return ok<{ id: string }>(
    await api.post('/supplies', { name: unique('Test bag'), unit: 'each', costPerUnit, category: 'PACKAGING' })
  );
}

/** A product body with one batch-yield variation that uses the given supplies. */
export function productBody(recipeId: string, supplyIds: string[] = [], name = unique('Test product')) {
  return {
    name,
    recipeId,
    recipeScale: 1,
    variations: [
      {
        name: 'Regular',
        batchYieldQty: 10,
        laborCost: 1,
        overheadCost: 0.5,
        variationSupplies: supplyIds.map((supplyId) => ({ supplyId, quantity: 2 })),
      },
    ],
  };
}
