import { describe, expect, it } from 'vitest';
import { asA, asB, ok } from './client';
import { makeRecipe, makeSupply, productBody } from './fixtures';

type Variation = {
  id: string;
  name: string;
  supplyCost: string;
  totalCost: string;
  variationSupplies: { supplyId: string }[];
};

describe('products API', () => {
  it('creates a product with variations and costs its supplies', async () => {
    const { recipe } = await makeRecipe();
    const bag = await makeSupply(asA(), 0.25);

    const product = ok(await asA().post('/products', productBody(recipe.id, [bag.id])));

    expect(product.variations).toHaveLength(1);
    const v: Variation = product.variations[0];
    expect(Number(v.supplyCost)).toBeCloseTo(0.5); // 2 bags x $0.25
    expect(Number(v.totalCost)).toBeGreaterThanOrEqual(2); // + labor 1 + overhead 0.5
    expect(v.variationSupplies.map((s) => s.supplyId)).toEqual([bag.id]);
    expect(product.warnings).toEqual(expect.any(Array));
  });

  it("rejects a supply from another bakery and writes nothing", async () => {
    const { recipe } = await makeRecipe();
    const foreign = await makeSupply(asB());

    const res = await asA().post('/products', productBody(recipe.id, [foreign.id], 'Should not exist'));
    expect(res.status).toBe(422);
    expect(res.body.error).toMatch(/Supply not found or belongs to another bakery/);

    const list = ok(await asA().get('/products?search=Should%20not%20exist'));
    expect(list).toHaveLength(0);
  });

  it("rejects a recipe from another bakery", async () => {
    const { recipe } = await makeRecipe(asB());
    const res = await asA().post('/products', productBody(recipe.id));
    expect(res.status).toBe(422);
  });

  it('replaces variations on update and leaves the product intact on rejection', async () => {
    const { recipe } = await makeRecipe();
    const bag = await makeSupply();
    const product = ok(await asA().post('/products', productBody(recipe.id, [bag.id])));

    const foreign = await makeSupply(asB());
    const rejected = await asA().put(`/products/${product.id}`, {
      name: 'Renamed',
      variations: productBody(recipe.id, [foreign.id]).variations,
    });
    expect(rejected.status).toBe(422);
    const unchanged = ok(await asA().get(`/products/${product.id}?include=variations.variationSupplies`));
    expect(unchanged.name).toBe(product.name);
    expect(unchanged.variations[0].variationSupplies[0].supplyId).toBe(bag.id);

    const kept = product.variations[0];
    const updated = ok(
      await asA().put(`/products/${product.id}`, {
        variations: [
          { id: kept.id, name: 'Regular', batchYieldQty: 10 },
          { name: 'Large', batchYieldQty: 5 },
        ],
      })
    );
    expect(updated.variations.map((v: Variation) => v.name).sort()).toEqual(['Large', 'Regular']);
    expect(updated.variations.find((v: Variation) => v.name === 'Regular').id).toBe(kept.id);
  });

  it('updates product fields without variations', async () => {
    const { recipe } = await makeRecipe();
    const product = ok(await asA().post('/products', productBody(recipe.id)));
    const updated = ok(await asA().put(`/products/${product.id}`, { recipeScale: 2 }));
    expect(Number(updated.recipeScale)).toBe(2);
    expect(updated.variations).toHaveLength(1);
  });

  it('recalculates costs after a supply price change', async () => {
    const { recipe } = await makeRecipe();
    const bag = await makeSupply(asA(), 0.25);
    const product = ok(await asA().post('/products', productBody(recipe.id, [bag.id])));

    ok(await asA().put(`/supplies/${bag.id}`, { costPerUnit: 1 }));
    const recalculated = ok(await asA().post(`/products/${product.id}/recalculate`, {}));
    expect(Number(recalculated.variations[0].supplyCost)).toBeCloseTo(2);
  });

  it('blocks deleting a recipe that a product uses', async () => {
    const { recipe } = await makeRecipe();
    ok(await asA().post('/products', productBody(recipe.id)));
    const res = await asA().del(`/recipes/${recipe.id}`);
    expect(res.status).toBe(409);
  });

  it("hides another bakery's product", async () => {
    const { recipe } = await makeRecipe();
    const product = ok(await asA().post('/products', productBody(recipe.id)));
    expect((await asB().get(`/products/${product.id}`)).status).toBe(404);
    expect((await asB().put(`/products/${product.id}`, { name: 'x' })).status).toBe(404);
    expect((await asB().post(`/products/${product.id}/recalculate`, {})).status).toBe(404);
    expect((await asB().del(`/products/${product.id}`)).status).toBe(404);
  });

  it('searches by name', async () => {
    const { recipe } = await makeRecipe();
    const product = ok(await asA().post('/products', productBody(recipe.id)));
    const found = ok(await asA().get(`/products?search=${encodeURIComponent(product.name)}`));
    expect(found.map((p: { id: string }) => p.id)).toEqual([product.id]);
  });
});
