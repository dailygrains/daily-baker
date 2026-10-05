import { describe, expect, it } from 'vitest';
import { asA, asB, ok, unique } from './client';
import { makeRecipe, makeSupply, productBody } from './fixtures';
import { makeVendor } from './vendor-fixtures';

type SupplyVendor = { vendorId: string; vendor?: { id: string; name: string } };

describe('supplies API', () => {
  it('creates, reads, updates and deletes a supply', async () => {
    const name = unique('Test box');
    const supply = ok(
      await asA().post('/supplies', { name, unit: 'each', costPerUnit: 0.4, category: 'PACKAGING' })
    );
    expect(supply.name).toBe(name);
    expect(Number(supply.costPerUnit)).toBeCloseTo(0.4);

    expect(ok(await asA().get(`/supplies/${supply.id}`)).id).toBe(supply.id);

    const updated = ok(await asA().put(`/supplies/${supply.id}`, { name: `${name} v2`, quantityOnHand: 12 }));
    expect(updated.name).toBe(`${name} v2`);
    expect(Number(updated.quantityOnHand)).toBe(12);

    ok(await asA().del(`/supplies/${supply.id}`));
    expect((await asA().get(`/supplies/${supply.id}`)).status).toBe(404);
  });

  it('links vendors on create and replaces them on update', async () => {
    const v1 = await makeVendor();
    const v2 = await makeVendor();

    const supply = ok(
      await asA().post('/supplies', { name: unique('Test lid'), unit: 'each', vendorIds: [v1.id, v2.id] })
    );
    const linked = ok(await asA().get(`/supplies/${supply.id}?include=vendors.vendor`));
    expect(linked.vendors.map((sv: SupplyVendor) => sv.vendorId).sort()).toEqual([v1.id, v2.id].sort());
    expect(linked.vendors[0].vendor.name).toEqual(expect.any(String));

    ok(await asA().put(`/supplies/${supply.id}`, { vendorIds: [v2.id] }));
    const replaced = ok(await asA().get(`/supplies/${supply.id}?include=vendors`));
    expect(replaced.vendors.map((sv: SupplyVendor) => sv.vendorId)).toEqual([v2.id]);

    // Omitting vendorIds leaves the links alone.
    ok(await asA().put(`/supplies/${supply.id}`, { name: unique('Test lid') }));
    const kept = ok(await asA().get(`/supplies/${supply.id}?include=vendors`));
    expect(kept.vendors.map((sv: SupplyVendor) => sv.vendorId)).toEqual([v2.id]);

    ok(await asA().put(`/supplies/${supply.id}`, { vendorIds: [] }));
    const cleared = ok(await asA().get(`/supplies/${supply.id}?include=vendors`));
    expect(cleared.vendors).toEqual([]);
  });

  it('rejects a vendor from another bakery and writes nothing', async () => {
    const foreign = await makeVendor(asB());
    const name = unique('Should not exist');

    const res = await asA().post('/supplies', { name, unit: 'each', vendorIds: [foreign.id] });
    expect(res.status).toBe(422);
    expect(ok(await asA().get(`/supplies?search=${encodeURIComponent(name)}`))).toHaveLength(0);

    const own = await makeVendor();
    const supply = ok(await asA().post('/supplies', { name: unique('Test cup'), unit: 'each', vendorIds: [own.id] }));
    const rejected = await asA().put(`/supplies/${supply.id}`, { name: 'Renamed', vendorIds: [foreign.id] });
    expect(rejected.status).toBe(422);
    const unchanged = ok(await asA().get(`/supplies/${supply.id}?include=vendors`));
    expect(unchanged.name).toBe(supply.name);
    expect(unchanged.vendors.map((sv: SupplyVendor) => sv.vendorId)).toEqual([own.id]);
  });

  it('blocks deleting a supply a product uses', async () => {
    const { recipe } = await makeRecipe();
    const bag = await makeSupply();
    ok(await asA().post('/products', productBody(recipe.id, [bag.id])));

    const res = await asA().del(`/supplies/${bag.id}`);
    expect(res.status).toBe(409);
    expect(res.body.error).toMatch(/used in products/);
    expect((await asA().get(`/supplies/${bag.id}`)).status).toBe(200);
  });

  it("hides another bakery's supply", async () => {
    const supply = await makeSupply();
    expect((await asB().get(`/supplies/${supply.id}`)).status).toBe(404);
    expect((await asB().put(`/supplies/${supply.id}`, { name: 'x' })).status).toBe(404);
    expect((await asB().del(`/supplies/${supply.id}`)).status).toBe(404);
    expect((await asA().get(`/supplies/${supply.id}`)).status).toBe(200);
  });

  it('rejects invalid input with 422', async () => {
    const res = await asA().post('/supplies', { name: '', unit: 'each' });
    expect(res.status).toBe(422);
  });
});
