import 'dotenv/config';
import crypto from 'node:crypto';
import { afterAll, describe, expect, inject, it } from 'vitest';
import { PrismaClient } from '../../src/generated/prisma';
import { asA, asB, ok, unique } from './client';
import { makeIngredient } from './fixtures';

type Api = ReturnType<typeof asA>;

// Direct DB access only to seed an InventoryUsage row, which the API cannot
// write yet (usages need a user; API keys have none).
const prisma = new PrismaClient();
const userIds: string[] = [];

afterAll(async () => {
  // Usages restrict deleting their creator, so clear them before the user.
  await prisma.inventoryUsage.deleteMany({ where: { createdBy: { in: userIds } } });
  await prisma.user.deleteMany({ where: { id: { in: userIds } } });
  await prisma.$disconnect();
});

async function makeVendor(api: Api = asA()) {
  return ok<{ id: string; name: string }>(await api.post('/vendors', { name: unique('Test mill') }));
}

function lotBody(ingredientId: string, extra: Record<string, unknown> = {}) {
  return { ingredientId, quantity: 2000, unit: 'g', totalCost: 8, ...extra };
}

/** Raw request, for responses that may not have a JSON body (Next's 405). */
async function raw(method: string, path: string, body?: unknown) {
  return fetch(`${inject('apiBase')}${path}`, {
    method,
    headers: {
      Authorization: `Bearer ${inject('bakeryA').key}`,
      'Content-Type': 'application/json',
    },
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });
}

async function seedUsage(lotId: string) {
  const user = await prisma.user.create({
    data: { clerkId: `api_test_${crypto.randomBytes(6).toString('hex')}`, email: 'api-test@example.com' },
  });
  userIds.push(user.id);
  return prisma.inventoryUsage.create({
    data: { lotId, quantity: 100, reason: 'USE', createdBy: user.id },
  });
}

describe('inventory lots API', () => {
  it('adds a lot, deriving cost per unit and creating the Inventory row', async () => {
    const ingredient = await makeIngredient();
    const vendor = await makeVendor();

    const lot = ok(
      await asA().post(
        '/inventory-lots',
        lotBody(ingredient.id, { vendorId: vendor.id, expiresAt: '2030-01-15T00:00:00.000Z', notes: 'Bag 1' })
      )
    );
    expect(Number(lot.purchaseQty)).toBe(2000);
    expect(Number(lot.remainingQty)).toBe(2000);
    expect(Number(lot.costPerUnit)).toBeCloseTo(0.004);
    expect(lot.expiresAt).toBe('2030-01-15T00:00:00.000Z');
    expect(lot.vendor.id).toBe(vendor.id);
    expect(lot.inventory.ingredient.id).toBe(ingredient.id);
    expect(lot.inventory.displayUnit).toBe('g');

    // A second lot reuses the same Inventory row.
    const second = ok(await asA().post('/inventory-lots', lotBody(ingredient.id)));
    expect(second.inventoryId).toBe(lot.inventoryId);
  });

  it("rejects another bakery's ingredient or vendor", async () => {
    const foreignIngredient = await makeIngredient(asB());
    const res = await asA().post('/inventory-lots', lotBody(foreignIngredient.id));
    expect(res.status).toBe(422);
    expect(res.body.error).toMatch(/Ingredient not found or belongs to another bakery/);

    const ingredient = await makeIngredient();
    const foreignVendor = await makeVendor(asB());
    const res2 = await asA().post('/inventory-lots', lotBody(ingredient.id, { vendorId: foreignVendor.id }));
    expect(res2.status).toBe(422);
    expect(res2.body.error).toMatch(/Vendor not found or belongs to another bakery/);

    const read = ok(await asA().get(`/ingredients/${ingredient.id}?include=inventory`));
    expect(read.inventory).toBeNull();
  });

  it('validates the body', async () => {
    const ingredient = await makeIngredient();
    expect((await asA().post('/inventory-lots', lotBody(ingredient.id, { quantity: 0 }))).status).toBe(422);
    expect(
      (await asA().post('/inventory-lots', lotBody(ingredient.id, { expiresAt: 'not a date' }))).status
    ).toBe(422);
  });

  it('updates lot metadata but not quantities', async () => {
    const ingredient = await makeIngredient();
    const lot = ok(await asA().post('/inventory-lots', lotBody(ingredient.id)));
    const vendor = await makeVendor();

    const updated = ok(
      await asA().put(`/inventory-lots/${lot.id}`, {
        notes: 'Moved to shelf B',
        vendorId: vendor.id,
        expiresAt: '2031-06-01T00:00:00.000Z',
        remainingQty: 1,
        purchaseQty: 1,
      })
    );
    expect(updated.notes).toBe('Moved to shelf B');
    expect(updated.vendor.id).toBe(vendor.id);
    expect(updated.expiresAt).toBe('2031-06-01T00:00:00.000Z');
    expect(Number(updated.remainingQty)).toBe(2000);
    expect(Number(updated.purchaseQty)).toBe(2000);

    const foreignVendor = await makeVendor(asB());
    const res = await asA().put(`/inventory-lots/${lot.id}`, { vendorId: foreignVendor.id });
    expect(res.status).toBe(422);
  });

  it('deletes an unused lot', async () => {
    const ingredient = await makeIngredient();
    const lot = ok(await asA().post('/inventory-lots', lotBody(ingredient.id)));
    ok(await asA().del(`/inventory-lots/${lot.id}`));
    expect((await asA().get(`/inventory-lots/${lot.id}`)).status).toBe(404);
  });

  it('blocks deleting a lot with usage records and keeps them', async () => {
    const ingredient = await makeIngredient();
    const lot = ok(await asA().post('/inventory-lots', lotBody(ingredient.id)));
    const usage = await seedUsage(lot.id);

    const res = await asA().del(`/inventory-lots/${lot.id}`);
    expect(res.status).toBe(409);
    expect(res.body.error).toMatch(/usage record/);

    ok(await asA().get(`/inventory-lots/${lot.id}`));
    expect(await prisma.inventoryUsage.findUnique({ where: { id: usage.id } })).not.toBeNull();
  });

  it("hides another bakery's lots", async () => {
    const ingredient = await makeIngredient();
    const lot = ok(await asA().post('/inventory-lots', lotBody(ingredient.id)));

    expect((await asB().get(`/inventory-lots/${lot.id}`)).status).toBe(404);
    expect((await asB().put(`/inventory-lots/${lot.id}`, { notes: 'x' })).status).toBe(404);
    expect((await asB().del(`/inventory-lots/${lot.id}`)).status).toBe(404);

    const bList = ok(await asB().get('/inventory-lots?limit=100'));
    expect(bList.map((l: { id: string }) => l.id)).not.toContain(lot.id);
    ok(await asA().get(`/inventory-lots/${lot.id}`));
  });
});

describe('inventory API', () => {
  async function makeInventory() {
    const ingredient = await makeIngredient();
    const lot = ok(await asA().post('/inventory-lots', lotBody(ingredient.id)));
    return { ingredient, lot, inventoryId: lot.inventoryId as string };
  }

  it('reads inventory with its lots', async () => {
    const { inventoryId, lot } = await makeInventory();
    const inventory = ok(await asA().get(`/inventory/${inventoryId}?include=lots,ingredient`));
    expect(inventory.lots.map((l: { id: string }) => l.id)).toEqual([lot.id]);
    expect(inventory.ingredient).toBeTruthy();
  });

  it('updates only lowStockThreshold', async () => {
    const { inventoryId, ingredient } = await makeInventory();

    const updated = ok(await asA().put(`/inventory/${inventoryId}`, { lowStockThreshold: 3 }));
    expect(Number(updated.lowStockThreshold)).toBe(3);

    const otherIngredient = await makeIngredient();
    for (const body of [
      { bakeryId: inject('bakeryB').id },
      { ingredientId: otherIngredient.id },
      { displayUnit: 'kg' },
    ]) {
      const res = await asA().put(`/inventory/${inventoryId}`, body);
      expect(res.status).toBe(422);
    }

    const read = ok(await asA().get(`/inventory/${inventoryId}`));
    expect(read.ingredientId).toBe(ingredient.id);
    expect(read.displayUnit).toBe('g');
    expect(Number(read.lowStockThreshold)).toBe(3);
  });

  it('does not allow creating or deleting inventory rows', async () => {
    const { inventoryId, ingredient, lot } = await makeInventory();

    const post = await raw('POST', '/inventory', { ingredientId: ingredient.id, displayUnit: 'g' });
    expect(post.status).toBe(405);

    const del = await raw('DELETE', `/inventory/${inventoryId}`);
    expect(del.status).toBe(405);

    ok(await asA().get(`/inventory/${inventoryId}`));
    ok(await asA().get(`/inventory-lots/${lot.id}`));
  });

  it("hides another bakery's inventory", async () => {
    const { inventoryId } = await makeInventory();
    expect((await asB().get(`/inventory/${inventoryId}`)).status).toBe(404);
    expect((await asB().put(`/inventory/${inventoryId}`, { lowStockThreshold: 1 })).status).toBe(404);
  });
});
