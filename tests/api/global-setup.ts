import 'dotenv/config';
import crypto from 'node:crypto';
import bcrypt from 'bcryptjs';
import type { TestProject } from 'vitest/node';
import { PrismaClient } from '../../src/generated/prisma';

declare module 'vitest' {
  export interface ProvidedContext {
    apiBase: string;
    bakeryA: { id: string; key: string; readOnlyKey: string };
    bakeryB: { id: string; key: string };
  }
}

const LOCAL_HOSTS = new Set(['localhost', '127.0.0.1', '[::1]']);

function assertLocalDatabase() {
  const url = process.env.DATABASE_URL;
  if (!url) throw new Error('DATABASE_URL is not set');
  const host = new URL(url).hostname;
  if (!LOCAL_HOSTS.has(host)) {
    throw new Error(`Refusing to run API tests against non-local database host "${host}"`);
  }
}

async function createKey(db: PrismaClient, bakeryId: string, scopes: string[]) {
  const key = 'dbk_' + crypto.randomBytes(16).toString('hex');
  await db.apiKey.create({
    data: {
      bakeryId,
      name: 'api test',
      keyHash: await bcrypt.hash(key, 10),
      prefix: key.slice(0, 12),
      scopes,
    },
  });
  return key;
}

const TEST_BAKERY_PREFIX = 'API Test ';

/**
 * Delete test bakeries and everything they own. Bakery deletes cascade,
 * except through Restrict relations, so clear those dependents first
 * (sheets and products before recipes, recipes before the ingredients they
 * reference).
 */
async function deleteBakeries(db: PrismaClient, ids: string[]) {
  const bakeryId = { in: ids };
  await db.$transaction([
    db.productionSheet.deleteMany({ where: { bakeryId } }),
    db.product.deleteMany({ where: { bakeryId } }),
    db.recipe.deleteMany({ where: { bakeryId } }),
    db.bakery.deleteMany({ where: { id: bakeryId } }),
  ]);
}

export default async function setup(project: TestProject) {
  assertLocalDatabase();
  const apiBase = process.env.TEST_API_BASE ?? 'http://localhost:3031/api/v1';
  const db = new PrismaClient();
  const run = crypto.randomBytes(4).toString('hex');

  // Clear bakeries left behind by an interrupted run. Only old ones, so
  // concurrent runs don't delete each other's live fixtures.
  const stale = await db.bakery.findMany({
    where: {
      name: { startsWith: TEST_BAKERY_PREFIX },
      createdAt: { lt: new Date(Date.now() - 60 * 60 * 1000) },
    },
    select: { id: true },
  });
  await deleteBakeries(db, stale.map((s) => s.id));

  const [a, b] = await Promise.all(
    ['A', 'B'].map((tag) =>
      db.bakery.create({ data: { name: `${TEST_BAKERY_PREFIX}${tag} ${run}`, slug: `api-test-${tag.toLowerCase()}-${run}` } })
    )
  );

  project.provide('apiBase', apiBase);
  project.provide('bakeryA', {
    id: a.id,
    key: await createKey(db, a.id, ['read', 'write']),
    readOnlyKey: await createKey(db, a.id, ['read']),
  });
  project.provide('bakeryB', { id: b.id, key: await createKey(db, b.id, ['read', 'write']) });

  return async () => {
    await deleteBakeries(db, [a.id, b.id]);
    await db.$disconnect();
  };
}
