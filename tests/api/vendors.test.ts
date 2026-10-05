import 'dotenv/config';
import { afterAll, describe, expect, it } from 'vitest';
import { PrismaClient } from '../../src/generated/prisma';
import { asA, asB, ok, unique } from './client';
import { makeIngredient } from './fixtures';
import { makeVendor } from './vendor-fixtures';

// Direct DB access only to seed an ingredient-vendor link, which belongs to
// the ingredients domain's endpoints.
const prisma = new PrismaClient();
afterAll(() => prisma.$disconnect());

describe('vendors API', () => {
  it('creates, reads, updates and deletes a vendor', async () => {
    const vendor = ok(
      await asA().post('/vendors', {
        name: unique('Test mill'),
        email: 'orders@example.com',
        website: 'https://example.com',
      })
    );
    expect(vendor.email).toBe('orders@example.com');

    const updated = ok(await asA().put(`/vendors/${vendor.id}`, { phone: '555-0100', notes: 'Net 30' }));
    expect(updated.phone).toBe('555-0100');
    expect(updated.email).toBe('orders@example.com');

    ok(await asA().del(`/vendors/${vendor.id}`));
    expect((await asA().get(`/vendors/${vendor.id}`)).status).toBe(404);
  });

  it('ignores contactName and address, which have no column', async () => {
    const vendor = ok(
      await asA().post('/vendors', { name: unique('Test mill'), contactName: 'Pat', address: '1 Main St' })
    );
    expect(vendor.contactName).toBeUndefined();
    expect(vendor.address).toBeUndefined();

    const updated = ok(await asA().put(`/vendors/${vendor.id}`, { contactName: 'Sam', address: '2 Main St', notes: 'x' }));
    expect(updated.notes).toBe('x');
  });

  it('rejects invalid input with 422', async () => {
    expect((await asA().post('/vendors', { name: unique('Test mill'), email: 'nope' })).status).toBe(422);
  });

  it('searches by name', async () => {
    const vendor = await makeVendor();
    const found = ok(await asA().get(`/vendors?search=${encodeURIComponent(vendor.name)}`));
    expect(found.map((v: { id: string }) => v.id)).toEqual([vendor.id]);
  });

  it('blocks deleting a vendor linked to equipment', async () => {
    const vendor = await makeVendor();
    const item = ok(await asA().post('/equipment', { name: unique('Test mixer'), vendorId: vendor.id }));

    const res = await asA().del(`/vendors/${vendor.id}`);
    expect(res.status).toBe(409);
    expect(res.body.error).toMatch(/Cannot delete vendor/);
    expect((await asA().get(`/vendors/${vendor.id}`)).status).toBe(200);
    expect(ok(await asA().get(`/equipment/${item.id}`)).vendorId).toBe(vendor.id);
  });

  it('blocks deleting a vendor linked to an ingredient', async () => {
    const vendor = await makeVendor();
    const ingredient = await makeIngredient();
    await prisma.ingredientVendor.create({ data: { ingredientId: ingredient.id, vendorId: vendor.id } });

    const res = await asA().del(`/vendors/${vendor.id}`);
    expect(res.status).toBe(409);
    expect((await asA().get(`/vendors/${vendor.id}`)).status).toBe(200);
    expect(await prisma.ingredientVendor.count({ where: { vendorId: vendor.id } })).toBe(1);
  });

  it("hides another bakery's vendor", async () => {
    const vendor = await makeVendor();
    expect((await asB().get(`/vendors/${vendor.id}`)).status).toBe(404);
    expect((await asB().put(`/vendors/${vendor.id}`, { name: 'x' })).status).toBe(404);
    expect((await asB().del(`/vendors/${vendor.id}`)).status).toBe(404);
    expect((await asA().get(`/vendors/${vendor.id}`)).status).toBe(200);
  });
});

describe('vendor delete cleanup', () => {
  it('removes the vendor tag assignments', async () => {
    const vendor = ok(await asA().post('/vendors', { name: unique('Tagged vendor') }));
    const type = ok(await asA().post('/tag-types', { name: unique('Type') }));
    const tag = ok(await asA().post('/tags', { name: unique('Tag'), tagTypeId: type.id }));
    ok(await asA().post(`/tags/${tag.id}/assignments`, { entityType: 'vendor', entityId: vendor.id }));

    ok(await asA().del(`/vendors/${vendor.id}`));
    expect(ok(await asA().get(`/tags/${tag.id}/assignments`))).toHaveLength(0);
  });
});
