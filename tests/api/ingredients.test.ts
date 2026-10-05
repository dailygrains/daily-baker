import { describe, expect, it } from 'vitest';
import { asA, asAReadOnly, asB, ok, unique } from './client';
import { makeIngredient, makeRecipe } from './fixtures';

type Api = ReturnType<typeof asA>;

async function makeVendor(api: Api = asA()) {
  return ok<{ id: string; name: string }>(await api.post('/vendors', { name: unique('Test mill') }));
}

async function addLot(ingredientId: string, api: Api = asA()) {
  return ok<{ id: string }>(
    await api.post('/inventory-lots', { ingredientId, quantity: 1000, unit: 'g', totalCost: 5 })
  );
}

describe('ingredients API', () => {
  it('creates, reads, updates, searches and deletes an ingredient', async () => {
    const created = ok(
      await asA().post('/ingredients', { name: unique('Test rye'), unit: 'g', densityGramsPerMl: 0.6 })
    );
    expect(created.unit).toBe('g');
    expect(Number(created.densityGramsPerMl)).toBeCloseTo(0.6);

    const updated = ok(await asA().put(`/ingredients/${created.id}`, { name: `${created.name} 2` }));
    expect(updated.name).toBe(`${created.name} 2`);
    expect(updated.unit).toBe('g');

    const found = ok(await asA().get(`/ingredients?search=${encodeURIComponent(updated.name)}`));
    expect(found.map((i: { id: string }) => i.id)).toEqual([created.id]);

    ok(await asA().del(`/ingredients/${created.id}`));
    expect((await asA().get(`/ingredients/${created.id}`)).status).toBe(404);
  });

  it('removes tag assignments when an ingredient is deleted', async () => {
    const ingredient = await makeIngredient();
    const tagType = ok(await asA().post('/tag-types', { name: unique('Dietary') }));
    const tag = ok(await asA().post('/tags', { tagTypeId: tagType.id, name: unique('Organic') }));
    ok(await asA().post(`/tags/${tag.id}/assignments`, { entityType: 'ingredient', entityId: ingredient.id }));

    const before = ok(await asA().get(`/tags/${tag.id}/assignments`));
    expect(JSON.stringify(before)).toContain(ingredient.id);

    ok(await asA().del(`/ingredients/${ingredient.id}`));

    const after = ok(await asA().get(`/tags/${tag.id}/assignments`));
    expect(JSON.stringify(after)).not.toContain(ingredient.id);
  });

  it('rejects writes from a read-only key', async () => {
    const res = await asAReadOnly().post('/ingredients', { name: unique('Test flour'), unit: 'g' });
    expect(res.status).toBe(403);
  });

  it('validates the body', async () => {
    const res = await asA().post('/ingredients', { name: '', unit: 'g' });
    expect(res.status).toBe(422);
  });

  it('stores lowStockThreshold on the Inventory row, creating it if needed', async () => {
    const ingredient = await makeIngredient();

    const updated = ok(await asA().put(`/ingredients/${ingredient.id}`, { lowStockThreshold: 5 }));
    expect(updated.lowStockThreshold).toBeUndefined();
    expect(Number(updated.inventory.lowStockThreshold)).toBe(5);

    // Existing inventory (from a lot) is updated in place.
    await addLot(ingredient.id);
    ok(await asA().put(`/ingredients/${ingredient.id}`, { lowStockThreshold: 12.5 }));
    const read = ok(await asA().get(`/ingredients/${ingredient.id}?include=inventory.lots`));
    expect(Number(read.inventory.lowStockThreshold)).toBe(12.5);
    expect(read.inventory.lots).toHaveLength(1);

    ok(await asA().put(`/ingredients/${ingredient.id}`, { lowStockThreshold: null }));
    const cleared = ok(await asA().get(`/ingredients/${ingredient.id}?include=inventory`));
    expect(cleared.inventory.lowStockThreshold).toBeNull();
  });

  it('does not create an Inventory row just to store a null threshold', async () => {
    const ingredient = await makeIngredient();
    ok(await asA().put(`/ingredients/${ingredient.id}`, { lowStockThreshold: null, unit: 'kg' }));
    const read = ok(await asA().get(`/ingredients/${ingredient.id}?include=inventory`));
    expect(read.unit).toBe('kg');
    expect(read.inventory).toBeNull();
  });

  it('blocks deleting an ingredient used in a recipe', async () => {
    const { ingredient } = await makeRecipe();
    const res = await asA().del(`/ingredients/${ingredient.id}`);
    expect(res.status).toBe(409);
    expect(res.body.error).toMatch(/recipe usage/);
    ok(await asA().get(`/ingredients/${ingredient.id}`));
  });

  it('blocks deleting an ingredient with inventory lots and keeps its history', async () => {
    const ingredient = await makeIngredient();
    const lot = await addLot(ingredient.id);

    const res = await asA().del(`/ingredients/${ingredient.id}`);
    expect(res.status).toBe(409);
    expect(res.body.error).toMatch(/inventory lot/);

    ok(await asA().get(`/ingredients/${ingredient.id}`));
    ok(await asA().get(`/inventory-lots/${lot.id}`));
  });

  it('assigns and unassigns vendors, visible through include=vendors.vendor', async () => {
    const ingredient = await makeIngredient();
    const vendor = await makeVendor();

    const link = ok(await asA().post(`/ingredients/${ingredient.id}/vendors`, { vendorId: vendor.id }));
    expect(link.vendorId).toBe(vendor.id);
    expect(link.vendor.name).toBe(vendor.name);

    const dup = await asA().post(`/ingredients/${ingredient.id}/vendors`, { vendorId: vendor.id });
    expect(dup.status).toBe(409);

    const withVendors = ok(await asA().get(`/ingredients/${ingredient.id}?include=vendors.vendor`));
    expect(withVendors.vendors.map((v: { vendor: { id: string } }) => v.vendor.id)).toEqual([vendor.id]);

    const listed = ok(
      await asA().get(`/ingredients?search=${encodeURIComponent(ingredient.name)}&include=vendors`)
    );
    expect(listed[0].vendors).toHaveLength(1);

    ok(await asA().del(`/ingredients/${ingredient.id}/vendors/${vendor.id}`));
    const after = ok(await asA().get(`/ingredients/${ingredient.id}?include=vendors`));
    expect(after.vendors).toHaveLength(0);

    expect((await asA().del(`/ingredients/${ingredient.id}/vendors/${vendor.id}`)).status).toBe(404);
  });

  it("rejects linking another bakery's vendor", async () => {
    const ingredient = await makeIngredient();
    const foreign = await makeVendor(asB());

    const res = await asA().post(`/ingredients/${ingredient.id}/vendors`, { vendorId: foreign.id });
    expect(res.status).toBe(422);
    expect(res.body.error).toMatch(/Vendor not found or belongs to another bakery/);

    const read = ok(await asA().get(`/ingredients/${ingredient.id}?include=vendors`));
    expect(read.vendors).toHaveLength(0);
  });

  it('validates the vendor link body', async () => {
    const ingredient = await makeIngredient();
    const res = await asA().post(`/ingredients/${ingredient.id}/vendors`, {});
    expect(res.status).toBe(422);
  });

  it("hides another bakery's ingredient", async () => {
    const ingredient = await makeIngredient();
    const vendor = await makeVendor();
    ok(await asA().post(`/ingredients/${ingredient.id}/vendors`, { vendorId: vendor.id }));
    const bVendor = await makeVendor(asB());

    expect((await asB().get(`/ingredients/${ingredient.id}`)).status).toBe(404);
    expect((await asB().put(`/ingredients/${ingredient.id}`, { name: 'x' })).status).toBe(404);
    expect((await asB().del(`/ingredients/${ingredient.id}`)).status).toBe(404);
    expect(
      (await asB().post(`/ingredients/${ingredient.id}/vendors`, { vendorId: bVendor.id })).status
    ).toBe(404);
    expect((await asB().del(`/ingredients/${ingredient.id}/vendors/${vendor.id}`)).status).toBe(404);

    // Still intact for its owner.
    const read = ok(await asA().get(`/ingredients/${ingredient.id}?include=vendors`));
    expect(read.vendors).toHaveLength(1);
  });
});
