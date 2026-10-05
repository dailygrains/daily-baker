import { describe, expect, it } from 'vitest';
import { asA, asAReadOnly, asB, ok } from './client';
import { makeIngredient, makeRecipe, recipeBody } from './fixtures';

describe('recipes API', () => {
  it('creates a recipe with nested sections and ingredients', async () => {
    const flour = await makeIngredient();
    const recipe = ok(await asA().post('/recipes', recipeBody([{ ingredientId: flour.id, quantity: 130 }])));

    expect(recipe.sections).toHaveLength(1);
    expect(recipe.sections[0].ingredients[0]).toMatchObject({ ingredientId: flour.id, unit: 'g' });
    expect(Number(recipe.sections[0].ingredients[0].quantity)).toBe(130);
    expect(recipe.totalCost).toBeDefined();
  });

  it("rejects an ingredient from another bakery", async () => {
    const foreign = await makeIngredient(asB());
    const res = await asA().post('/recipes', recipeBody([{ ingredientId: foreign.id, quantity: 10 }]));
    expect(res.status).toBe(422);
    expect(res.body.error).toMatch(/Ingredient not found or belongs to another bakery/);
  });

  it('replaces sections on update', async () => {
    const { recipe } = await makeRecipe();
    const rye = await makeIngredient();

    const updated = ok(
      await asA().put(`/recipes/${recipe.id}`, recipeBody([{ ingredientId: rye.id, quantity: 42 }], recipe.name))
    );
    expect(updated.sections).toHaveLength(1);
    expect(updated.sections[0].ingredients.map((i: { ingredientId: string }) => i.ingredientId)).toEqual([rye.id]);
  });

  it('keeps existing sections when an update is rejected', async () => {
    const { recipe, ingredient } = await makeRecipe();
    const foreign = await makeIngredient(asB());

    const res = await asA().put(`/recipes/${recipe.id}`, recipeBody([{ ingredientId: foreign.id, quantity: 1 }]));
    expect(res.status).toBe(422);

    const after = ok(await asA().get(`/recipes/${recipe.id}?include=sections.ingredients`));
    expect(after.sections[0].ingredients[0].ingredientId).toBe(ingredient.id);
  });

  it('updates scalar fields without touching sections', async () => {
    const { recipe } = await makeRecipe();
    ok(await asA().put(`/recipes/${recipe.id}`, { yieldQty: 3 }));
    const after = ok(await asA().get(`/recipes/${recipe.id}?include=sections`));
    expect(after.yieldQty).toBe(3);
    expect(after.sections).toHaveLength(1);
  });

  it("hides another bakery's recipe", async () => {
    const { recipe } = await makeRecipe();
    expect((await asB().get(`/recipes/${recipe.id}`)).status).toBe(404);
    expect((await asB().put(`/recipes/${recipe.id}`, { name: 'stolen' })).status).toBe(404);
    expect((await asB().del(`/recipes/${recipe.id}`)).status).toBe(404);
  });

  it('requires write scope', async () => {
    const flour = await makeIngredient();
    const res = await asAReadOnly().post('/recipes', recipeBody([{ ingredientId: flour.id, quantity: 1 }]));
    expect(res.status).toBe(403);
  });

  it('deletes a recipe', async () => {
    const { recipe } = await makeRecipe();
    ok(await asA().del(`/recipes/${recipe.id}`));
    expect((await asA().get(`/recipes/${recipe.id}`)).status).toBe(404);
  });
});
