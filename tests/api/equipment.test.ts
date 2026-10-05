import { describe, expect, it } from 'vitest';
import { asA, asB, ok, unique } from './client';
import { makeVendor } from './vendor-fixtures';

describe('equipment API', () => {
  it('creates, reads, updates and deletes equipment', async () => {
    const vendor = await makeVendor();
    const item = ok(
      await asA().post('/equipment', { name: unique('Test oven'), vendorId: vendor.id, cost: 1200, quantity: 2 })
    );
    expect(item.status).toBe('CONSIDERING');
    expect(Number(item.cost)).toBe(1200);

    const fetched = ok(await asA().get(`/equipment/${item.id}?include=vendor`));
    expect(fetched.vendor.id).toBe(vendor.id);

    const updated = ok(await asA().put(`/equipment/${item.id}`, { status: 'IN_USE', vendorId: null, cost: null }));
    expect(updated.status).toBe('IN_USE');
    expect(updated.vendorId).toBeNull();
    expect(updated.cost).toBeNull();

    ok(await asA().del(`/equipment/${item.id}`));
    expect((await asA().get(`/equipment/${item.id}`)).status).toBe(404);
  });

  it('accepts purchaseDate as an ISO string', async () => {
    const item = ok(
      await asA().post('/equipment', { name: unique('Test proofer'), purchaseDate: '2026-03-15' })
    );
    expect(item.purchaseDate).toBe('2026-03-15T00:00:00.000Z');

    const updated = ok(
      await asA().put(`/equipment/${item.id}`, { purchaseDate: '2026-04-01T12:00:00.000Z' })
    );
    expect(updated.purchaseDate).toBe('2026-04-01T12:00:00.000Z');

    const cleared = ok(await asA().put(`/equipment/${item.id}`, { purchaseDate: null }));
    expect(cleared.purchaseDate).toBeNull();

    expect((await asA().put(`/equipment/${item.id}`, { purchaseDate: 'not a date' })).status).toBe(422);
  });

  it('rejects a vendor from another bakery and writes nothing', async () => {
    const foreign = await makeVendor(asB());
    const name = unique('Should not exist');
    expect((await asA().post('/equipment', { name, vendorId: foreign.id })).status).toBe(422);
    expect(ok(await asA().get(`/equipment?search=${encodeURIComponent(name)}`))).toHaveLength(0);

    const item = ok(await asA().post('/equipment', { name: unique('Test sheeter') }));
    expect((await asA().put(`/equipment/${item.id}`, { vendorId: foreign.id })).status).toBe(422);
    expect(ok(await asA().get(`/equipment/${item.id}`)).vendorId).toBeNull();
  });

  it("hides another bakery's equipment", async () => {
    const item = ok(await asA().post('/equipment', { name: unique('Test scale') }));
    expect((await asB().get(`/equipment/${item.id}`)).status).toBe(404);
    expect((await asB().put(`/equipment/${item.id}`, { name: 'x' })).status).toBe(404);
    expect((await asB().del(`/equipment/${item.id}`)).status).toBe(404);
    expect((await asA().get(`/equipment/${item.id}`)).status).toBe(200);
  });
});
