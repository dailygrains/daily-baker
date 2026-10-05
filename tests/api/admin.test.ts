/* eslint-disable @typescript-eslint/no-explicit-any */
import 'dotenv/config';
import { afterAll, beforeAll, describe, expect, inject, it, vi } from 'vitest';
import { asA, asAReadOnly, ok, unique } from './client';
import type { ServiceContext } from '@/lib/services/context';

/**
 * Platform/admin resources: roles, unit conversions, bakeries, invitations,
 * users and user-bakery links.
 *
 * API keys are never platform admins, so over HTTP we can only prove that a
 * bakery key is now refused for admin writes (and that global reads work).
 * The admin paths are exercised by calling the shared services directly with
 * an admin ServiceContext against the local database.
 */

vi.mock('@/lib/ses', () => ({ sendUserInvitation: vi.fn(async () => undefined) }));

const LOCAL_HOSTS = new Set(['localhost', '127.0.0.1', '[::1]']);
const dbHost = new URL(process.env.DATABASE_URL ?? 'postgres://unset').hostname;
if (!LOCAL_HOSTS.has(dbHost)) {
  throw new Error(`Refusing to run admin service tests against non-local database host "${dbHost}"`);
}

const { db } = await import('@/lib/db');
const ses = await import('@/lib/ses');
const unitConversions = await import('@/lib/services/unitConversion');
const roles = await import('@/lib/services/role');
const bakeries = await import('@/lib/services/bakery');
const invitations = await import('@/lib/services/invitation');
const users = await import('@/lib/services/user');

/** Status only, for unexported methods: Next answers those 405 with an empty body. */
async function statusOf(method: string, path: string, body: unknown) {
  const res = await fetch(`${inject('apiBase')}${path}`, {
    method,
    headers: { Authorization: `Bearer ${inject('bakeryA').key}`, 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  return res.status;
}

const rand = () => Math.random().toString(36).slice(2, 8);

/** Expect a ServiceError with the given status. */
async function rejectsWith(promise: Promise<unknown>, status: number, message?: RegExp) {
  const error: any = await promise.then(
    () => {
      throw new Error(`Expected a ${status} ServiceError, but the call succeeded`);
    },
    (e) => e
  );
  expect(error?.status ?? error?.name, String(error?.message)).toBe(status);
  if (message) expect(error.message).toMatch(message);
}

/** Expect a zod validation failure (the API maps these to 422). */
async function rejectsWithValidation(promise: Promise<unknown>) {
  const error: any = await promise.catch((e) => e);
  expect(error?.name).toBe('ZodError');
}

// Rows created directly or via services, removed in afterAll.
const created = {
  users: [] as string[],
  bakeries: [] as string[],
  roles: [] as string[],
  conversions: [] as string[],
  invitations: [] as string[],
};

let adminUserId: string;
let admin: ServiceContext;
const nonAdmin: ServiceContext = { bakeryId: null, userId: null, isPlatformAdmin: false };

async function makeUser(label = 'user') {
  const user = await db.user.create({
    data: { clerkId: `test_${rand()}${rand()}`, email: `${label}-${rand()}@admin-test.local`, name: `Admin test ${label}` },
  });
  created.users.push(user.id);
  return user;
}

async function makeBakery() {
  const bakery = await bakeries.createBakery(admin, { name: `Admin Test Bakery ${rand()}` });
  created.bakeries.push(bakery.id);
  return bakery;
}

beforeAll(async () => {
  adminUserId = (await makeUser('admin')).id;
  admin = { bakeryId: null, userId: adminUserId, isPlatformAdmin: true };
});

afterAll(async () => {
  await db.invitation.deleteMany({
    where: { OR: [{ id: { in: created.invitations } }, { createdBy: { in: created.users } }] },
  });
  await db.unitConversion.deleteMany({ where: { id: { in: created.conversions } } });
  await db.recipe.deleteMany({ where: { bakeryId: { in: created.bakeries } } });
  await db.bakery.deleteMany({ where: { id: { in: created.bakeries } } });
  await db.user.deleteMany({ where: { id: { in: created.users } } });
  await db.role.deleteMany({ where: { id: { in: created.roles } } });
  await db.$disconnect();
});

// ---------------------------------------------------------------------------
// Over HTTP, as a bakery API key
// ---------------------------------------------------------------------------

describe('HTTP: unit conversions', () => {
  let conversionId: string;

  beforeAll(async () => {
    const conversion = await unitConversions.createUnitConversion(admin, {
      fromUnit: `u${rand()}`,
      toUnit: 'g',
      factor: 2.5,
      category: 'weight',
    });
    created.conversions.push(conversion.id);
    conversionId = conversion.id;
  });

  it('lists and reads global conversions with a bakery key (was a 500)', async () => {
    const list = await asA().get('/unit-conversions?limit=100');
    expect(list.status).toBe(200);
    expect(list.body.meta?.total).toBeGreaterThan(0);

    const one = ok(await asAReadOnly().get(`/unit-conversions/${conversionId}`));
    expect(one.id).toBe(conversionId);
  });

  it('refuses writes from a bakery key, leaving global data untouched', async () => {
    const fromUnit = `x${rand()}`;
    const res = await asA().post('/unit-conversions', { fromUnit, toUnit: 'g', factor: 1, category: 'weight' });
    expect(res.status).toBe(403);
    expect(await db.unitConversion.count({ where: { fromUnit } })).toBe(0);

    expect((await asA().put(`/unit-conversions/${conversionId}`, { factor: 99 })).status).toBe(403);
    expect((await asA().del(`/unit-conversions/${conversionId}`)).status).toBe(403);
    const after = await db.unitConversion.findUniqueOrThrow({ where: { id: conversionId } });
    expect(Number(after.factor)).toBe(2.5);
  });
});

describe('HTTP: admin-only resources refuse bakery keys', () => {
  it('roles', async () => {
    const role = await roles.createRole(admin, { name: `Http role ${rand()}`, permissions: {} });
    created.roles.push(role.id);

    expect((await asA().get('/roles')).status).toBe(403);
    expect((await asA().get(`/roles/${role.id}`)).status).toBe(403);
    expect((await asA().post('/roles', { name: unique('Role'), permissions: {} })).status).toBe(403);
    expect((await asA().put(`/roles/${role.id}`, { name: 'Hijacked' })).status).toBe(403);
    expect((await asA().del(`/roles/${role.id}`)).status).toBe(403);
    expect(await db.role.findUnique({ where: { id: role.id } })).toMatchObject({ name: role.name });
  });

  it('bakeries', async () => {
    const bakery = await makeBakery();
    expect((await asA().get('/bakeries')).status).toBe(403);
    expect((await asA().post('/bakeries', { name: unique('Bakery') })).status).toBe(403);
    expect((await asA().put(`/bakeries/${bakery.id}`, { name: 'Hijacked' })).status).toBe(403);
    expect((await asA().del(`/bakeries/${bakery.id}`)).status).toBe(403);
    expect(await db.bakery.findUnique({ where: { id: bakery.id } })).not.toBeNull();
  });

  it('invitations: reads, create, delete, revoke and resend are refused; there is no PUT', async () => {
    const invitation = await invitations.createInvitation(admin, { email: `http-${rand()}@admin-test.local` });
    created.invitations.push(invitation.id);

    expect((await asA().get('/invitations')).status).toBe(403);
    expect((await asA().get(`/invitations/${invitation.id}`)).status).toBe(403);

    const email = `forged-${rand()}@admin-test.local`;
    const forged = await asA().post('/invitations', {
      email,
      token: 'forged',
      status: 'ACCEPTED',
      expiresAt: new Date().toISOString(),
      createdBy: adminUserId,
    });
    expect(forged.status).toBe(403);
    expect(await db.invitation.count({ where: { email } })).toBe(0);

    expect((await asA().del(`/invitations/${invitation.id}`)).status).toBe(403);
    expect((await asA().post(`/invitations/${invitation.id}/revoke`, {})).status).toBe(403);
    expect((await asA().post(`/invitations/${invitation.id}/resend`, {})).status).toBe(403);
    expect(await statusOf('PUT', `/invitations/${invitation.id}`, { status: 'ACCEPTED' })).toBe(405);

    const after = await db.invitation.findUniqueOrThrow({ where: { id: invitation.id } });
    expect(after.status).toBe('PENDING');
  });

  it('users and user-bakery links', async () => {
    const user = await makeUser('http');
    const bakery = await makeBakery();

    expect((await asA().get('/users')).status).toBe(403);
    expect((await asA().put(`/users/${user.id}`, { isPlatformAdmin: true })).status).toBe(403);
    expect((await asA().del(`/users/${user.id}`)).status).toBe(403);
    expect((await asA().post(`/users/${user.id}/bakeries/${bakery.id}`, {})).status).toBe(403);
    expect((await asA().del(`/users/${user.id}/bakeries/${bakery.id}`)).status).toBe(403);
    // Users come from Clerk sign-up; the API never creates them.
    expect(await statusOf('POST', '/users', { clerkId: 'x', email: 'x@y.z' })).toBe(405);

    expect(await db.userBakery.count({ where: { userId: user.id } })).toBe(0);
    expect((await db.user.findUniqueOrThrow({ where: { id: user.id } })).isPlatformAdmin).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// Shared services, as a platform admin (the dashboard and Clerk admin path)
// ---------------------------------------------------------------------------

describe('service: unit conversions', () => {
  it('admin can create, update and delete; duplicates are a 409', async () => {
    const input = { fromUnit: `s${rand()}`, toUnit: 'ml', factor: 3, category: 'volume' };
    await rejectsWith(unitConversions.createUnitConversion(nonAdmin, input), 403);

    const conversion = await unitConversions.createUnitConversion(admin, input);
    created.conversions.push(conversion.id);
    await rejectsWith(unitConversions.createUnitConversion(admin, input), 409, /already exists/);

    const updated = await unitConversions.updateUnitConversion(admin, conversion.id, { factor: 4 });
    expect(Number(updated.factor)).toBe(4);
    expect(updated.category).toBe('volume');

    await unitConversions.deleteUnitConversion(admin, conversion.id);
    await rejectsWith(unitConversions.deleteUnitConversion(admin, conversion.id), 404);
  });
});

describe('service: roles', () => {
  it('admin can manage roles; names are unique and assigned roles cannot be deleted', async () => {
    const name = `Service role ${rand()}`;
    await rejectsWith(roles.createRole(nonAdmin, { name, permissions: {} }), 403);

    const role = await roles.createRole(admin, { name, permissions: { 'recipes.read': true } });
    created.roles.push(role.id);
    await rejectsWith(roles.createRole(admin, { name, permissions: {} }), 409);
    await rejectsWithValidation(roles.createRole(admin, { name: `x ${rand()}`, permissions: 'all' }));

    const updated = await roles.updateRole(admin, role.id, { description: 'Edited' });
    expect(updated).toMatchObject({ name, description: 'Edited' });

    const user = await makeUser('role');
    await users.assignUserRole(admin, user.id, role.id);
    await rejectsWith(roles.deleteRole(admin, role.id), 409, /assigned user/);

    await users.assignUserRole(admin, user.id, null);
    await roles.deleteRole(admin, role.id);
    await rejectsWith(roles.updateRole(admin, role.id, { name: 'Gone' }), 404);
  });
});

describe('service: bakeries', () => {
  it('generates a unique slug and ignores a caller-supplied one', async () => {
    const name = `Slug Test ${rand()}`;
    await rejectsWith(bakeries.createBakery(nonAdmin, { name }), 403);

    const first = await bakeries.createBakery(admin, { name, slug: 'forged' });
    const second = await bakeries.createBakery(admin, { name });
    created.bakeries.push(first.id, second.id);
    expect(first.slug).toBe(name.toLowerCase().replace(/ /g, '-'));
    expect(second.slug).toBe(`${first.slug}-1`);

    const updated = await bakeries.updateBakery(admin, first.id, { phone: '555-0100' });
    expect(updated).toMatchObject({ name, phone: '555-0100', slug: first.slug });
    await rejectsWith(bakeries.updateBakery(admin, 'cl0000000000000000000000', { name: 'x' }), 404);
  });

  it('refuses to delete a bakery with users (409)', async () => {
    const bakery = await makeBakery();
    const user = await makeUser('member');
    await users.assignUserToBakery(admin, user.id, bakery.id);

    await rejectsWith(bakeries.deleteBakery(admin, bakery.id), 409, /active user/);
  });

  it('returns 409, not 500, when Restrict foreign keys block the cascade', async () => {
    const bakery = await makeBakery();
    const ingredient = await db.ingredient.create({
      data: { bakeryId: bakery.id, name: 'Flour', unit: 'g' },
    });
    await db.recipe.create({
      data: {
        bakeryId: bakery.id,
        name: 'Loaf',
        yieldQty: 1,
        yieldUnit: 'loaf',
        sections: {
          create: [
            { name: 'Dough', order: 0, instructions: '', ingredients: { create: [{ ingredientId: ingredient.id, quantity: 500, unit: 'g' }] } },
          ],
        },
      },
    });

    await rejectsWith(bakeries.deleteBakery(admin, bakery.id), 409, /recipes/);
    expect(await db.bakery.findUnique({ where: { id: bakery.id } })).not.toBeNull();
  });

  it('deletes an empty bakery', async () => {
    const bakery = await makeBakery();
    await bakeries.deleteBakery(admin, bakery.id);
    expect(await db.bakery.findUnique({ where: { id: bakery.id } })).toBeNull();
    await rejectsWith(bakeries.deleteBakery(admin, bakery.id), 404);
  });
});

describe('service: invitations', () => {
  it('needs an admin with a user, and validates the body strictly', async () => {
    const email = `need-user-${rand()}@admin-test.local`;
    await rejectsWith(invitations.createInvitation(nonAdmin, { email }), 403);
    // A platform admin without a user (a future admin API key) cannot be the creator.
    await rejectsWith(
      invitations.createInvitation({ ...admin, userId: null }, { email }),
      422,
      /signed-in user/
    );
    await rejectsWithValidation(invitations.createInvitation(admin, { email, token: 'forged' }));
    await rejectsWith(invitations.createInvitation(admin, { email, bakeryId: 'nope' }), 422, /Bakery/);
  });

  it('creates with a server token and expiry, emails, dedupes, resends, revokes and deletes', async () => {
    const bakery = await makeBakery();
    const email = `invitee-${rand()}@admin-test.local`;
    const send = vi.mocked(ses.sendUserInvitation);
    send.mockClear();

    const invitation = await invitations.createInvitation(admin, { email, bakeryId: bakery.id });
    created.invitations.push(invitation.id);
    expect(invitation).toMatchObject({ email, bakeryId: bakery.id, status: 'PENDING', createdBy: adminUserId });
    expect(invitation.token).toMatch(/^[0-9a-f]{64}$/);
    expect(invitation.expiresAt.getTime()).toBeGreaterThan(Date.now() + 6 * 24 * 3600 * 1000);
    expect(send).toHaveBeenCalledWith(
      expect.objectContaining({ toEmail: email, bakeryName: bakery.name, inviteUrl: expect.stringContaining(invitation.token) })
    );

    await rejectsWith(invitations.createInvitation(admin, { email }), 409, /already pending/);
    const existing = await makeUser('existing');
    await rejectsWith(invitations.createInvitation(admin, { email: existing.email }), 409, /already exists/);

    send.mockClear();
    await invitations.resendInvitation(admin, invitation.id);
    expect(send).toHaveBeenCalledTimes(1);

    const revoked = await invitations.revokeInvitation(admin, invitation.id);
    expect(revoked.status).toBe('REVOKED');
    await rejectsWith(invitations.resendInvitation(admin, invitation.id), 409, /pending/);

    await invitations.deleteInvitation(admin, invitation.id);
    await rejectsWith(invitations.deleteInvitation(admin, invitation.id), 404);
    await rejectsWith(invitations.revokeInvitation(admin, invitation.id), 404);
  });
});

describe('service: users', () => {
  it('only allows name and roleId to be edited', async () => {
    const user = await makeUser('edit');
    await rejectsWith(users.updateUser(nonAdmin, user.id, { name: 'X' }), 403);
    await rejectsWithValidation(users.updateUser(admin, user.id, { isPlatformAdmin: true }));
    await rejectsWithValidation(users.updateUser(admin, user.id, { clerkId: 'stolen' }));
    await rejectsWith(users.updateUser(admin, user.id, { roleId: 'missing-role' }), 422, /Role/);

    const updated = await users.updateUser(admin, user.id, { name: 'Renamed' });
    expect(updated).toMatchObject({ name: 'Renamed', isPlatformAdmin: false, clerkId: user.clerkId });
    await rejectsWith(users.updateUser(admin, 'missing-user', { name: 'X' }), 404);
  });

  it('assigns and unassigns bakeries', async () => {
    const user = await makeUser('assign');
    const bakery = await makeBakery();
    await rejectsWith(users.assignUserToBakery(nonAdmin, user.id, bakery.id), 403);

    const assigned = await users.assignUserToBakery(admin, user.id, bakery.id);
    expect(assigned.bakeries.map((b) => b.bakeryId)).toEqual([bakery.id]);
    await rejectsWith(users.assignUserToBakery(admin, user.id, bakery.id), 409, /already assigned/);
    await rejectsWith(users.assignUserToBakery(admin, user.id, 'missing-bakery'), 404);
    await rejectsWith(users.assignUserToBakery(admin, 'missing-user', bakery.id), 404);

    const unassigned = await users.unassignUserFromBakery(admin, user.id, bakery.id);
    expect(unassigned.bakeries).toEqual([]);
    await rejectsWith(users.unassignUserFromBakery(admin, user.id, bakery.id), 404, /not assigned/);
  });

  it('blocks deleting a user with sent invitations (409), deletes otherwise', async () => {
    const inviter = await makeUser('inviter');
    const invitation = await invitations.createInvitation(
      { ...admin, userId: inviter.id },
      { email: `from-inviter-${rand()}@admin-test.local` }
    );
    created.invitations.push(invitation.id);
    await rejectsWith(users.deleteUser(admin, inviter.id), 409, /1 sent invitation/);

    const plain = await makeUser('plain');
    await users.deleteUser(admin, plain.id);
    expect(await db.user.findUnique({ where: { id: plain.id } })).toBeNull();
  });
});
