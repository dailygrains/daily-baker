import 'dotenv/config';
import { afterAll, describe, expect, it } from 'vitest';
import { PrismaClient } from '../../src/generated/prisma';
import { asA, asAReadOnly, asB, ok, unique } from './client';
import { makeRecipe } from './fixtures';

type Entry = { recipeId: string; scale: string; order: number };
type Sheet = { id: string; description: string | null; completed: boolean; recipes: Entry[] };

const LOCAL_HOSTS = new Set(['localhost', '127.0.0.1', '[::1]']);

/** Direct DB access, only to mark a sheet completed without touching inventory. */
function localDb() {
  const url = process.env.DATABASE_URL;
  if (!url || !LOCAL_HOSTS.has(new URL(url).hostname)) {
    throw new Error('Refusing to open a non-local database from tests');
  }
  return new PrismaClient();
}

const db = localDb();
afterAll(() => db.$disconnect());

async function makeSheet(recipeIds: string[], description = unique('Test sheet')) {
  return ok<Sheet & { warnings: unknown[] }>(
    await asA().post('/production-sheets', {
      description,
      notes: 'Morning bake',
      recipes: recipeIds.map((recipeId, order) => ({ recipeId, scale: 1, order })),
    })
  );
}

async function makeCompletedSheet() {
  const { recipe } = await makeRecipe();
  const sheet = await makeSheet([recipe.id]);
  await db.productionSheet.update({
    where: { id: sheet.id },
    data: { completed: true, completedAt: new Date() },
  });
  return { sheet, recipe };
}

const recipeIdsOf = (sheet: Sheet) => sheet.recipes.map((r) => r.recipeId);

describe('production sheets API', () => {
  it('creates a sheet with its recipe entries', async () => {
    const [{ recipe: r1 }, { recipe: r2 }] = await Promise.all([makeRecipe(), makeRecipe()]);

    const sheet = await makeSheet([r1.id, r2.id]);
    expect(sheet.completed).toBe(false);
    expect(recipeIdsOf(sheet)).toEqual([r1.id, r2.id]);
    // The recipe's ingredient has no inventory, so a shortfall is reported.
    expect(sheet.warnings.length).toBeGreaterThan(0);

    const fetched = ok<Sheet>(await asA().get(`/production-sheets/${sheet.id}?include=recipes.recipe`));
    expect(fetched.recipes).toHaveLength(2);
    expect(fetched.recipes.map((r) => Number(r.scale))).toEqual([1, 1]);
  });

  it('rejects a recipe from another bakery and writes nothing', async () => {
    const { recipe: mine } = await makeRecipe();
    const { recipe: foreign } = await makeRecipe(asB());
    const description = unique('Should not exist');

    const res = await asA().post('/production-sheets', {
      description,
      recipes: [
        { recipeId: mine.id, scale: 1 },
        { recipeId: foreign.id, scale: 1 },
      ],
    });
    expect(res.status).toBe(422);
    expect(res.body.error).toMatch(/Recipe not found or belongs to another bakery/);

    const list = ok<Sheet[]>(await asA().get(`/production-sheets?search=${encodeURIComponent(description)}`));
    expect(list).toHaveLength(0);
  });

  it('rejects a sheet with no recipes or a repeated recipe', async () => {
    const { recipe } = await makeRecipe();
    expect((await asA().post('/production-sheets', { recipes: [] })).status).toBe(422);
    const dup = await asA().post('/production-sheets', {
      recipes: [
        { recipeId: recipe.id, scale: 1 },
        { recipeId: recipe.id, scale: 2 },
      ],
    });
    expect(dup.status).toBe(422);
  });

  it('replaces recipes on update and leaves the sheet intact on rejection', async () => {
    const [{ recipe: r1 }, { recipe: r2 }] = await Promise.all([makeRecipe(), makeRecipe()]);
    const sheet = await makeSheet([r1.id]);

    const { recipe: foreign } = await makeRecipe(asB());
    const rejected = await asA().put(`/production-sheets/${sheet.id}`, {
      description: 'Renamed',
      recipes: [{ recipeId: foreign.id, scale: 1 }],
    });
    expect(rejected.status).toBe(422);
    const unchanged = ok<Sheet>(await asA().get(`/production-sheets/${sheet.id}?include=recipes`));
    expect(unchanged.description).toBe(sheet.description);
    expect(recipeIdsOf(unchanged)).toEqual([r1.id]);

    const updated = ok<Sheet>(
      await asA().put(`/production-sheets/${sheet.id}`, {
        description: 'Renamed',
        recipes: [
          { recipeId: r2.id, scale: 2, order: 0 },
          { recipeId: r1.id, scale: 0.5, order: 1 },
        ],
      })
    );
    expect(updated.description).toBe('Renamed');
    expect(recipeIdsOf(updated)).toEqual([r2.id, r1.id]);
    expect(updated.recipes.map((r) => Number(r.scale))).toEqual([2, 0.5]);
  });

  it('updates sheet fields without touching recipes', async () => {
    const { recipe } = await makeRecipe();
    const sheet = await makeSheet([recipe.id]);
    const updated = ok<Sheet & { notes: string }>(
      await asA().put(`/production-sheets/${sheet.id}`, { notes: 'Evening bake' })
    );
    expect(updated.notes).toBe('Evening bake');
    expect(recipeIdsOf(updated)).toEqual([recipe.id]);
  });

  it('adds, updates and removes a single recipe', async () => {
    const [{ recipe: r1 }, { recipe: r2 }] = await Promise.all([makeRecipe(), makeRecipe()]);
    const sheet = await makeSheet([r1.id]);
    const base = `/production-sheets/${sheet.id}/recipes`;

    const added = ok<Entry>(await asA().post(base, { recipeId: r2.id, scale: 3 }));
    expect(added.recipeId).toBe(r2.id);
    expect(Number(added.scale)).toBe(3);
    expect(added.order).toBe(1);

    expect((await asA().post(base, { recipeId: r2.id, scale: 1 })).status).toBe(409);

    const changed = ok<Entry>(await asA().put(`${base}/${r2.id}`, { scale: 1.5, order: 5 }));
    expect(Number(changed.scale)).toBe(1.5);
    expect(changed.order).toBe(5);

    ok(await asA().del(`${base}/${r2.id}`));
    const after = ok<Sheet>(await asA().get(`/production-sheets/${sheet.id}?include=recipes`));
    expect(recipeIdsOf(after)).toEqual([r1.id]);

    // The last recipe cannot be removed.
    const last = await asA().del(`${base}/${r1.id}`);
    expect(last.status).toBe(409);

    // An entry that is not on the sheet is a 404.
    expect((await asA().put(`${base}/${r2.id}`, { scale: 2 })).status).toBe(404);
  });

  it('rejects adding a recipe from another bakery', async () => {
    const { recipe } = await makeRecipe();
    const sheet = await makeSheet([recipe.id]);
    const { recipe: foreign } = await makeRecipe(asB());
    const res = await asA().post(`/production-sheets/${sheet.id}/recipes`, {
      recipeId: foreign.id,
      scale: 1,
    });
    expect(res.status).toBe(422);
  });

  it('refuses to edit or delete a completed sheet', async () => {
    const { sheet, recipe } = await makeCompletedSheet();
    const { recipe: other } = await makeRecipe();
    const base = `/production-sheets/${sheet.id}`;

    expect((await asA().put(base, { notes: 'Changed' })).status).toBe(409);
    expect((await asA().put(base, { recipes: [{ recipeId: other.id, scale: 1 }] })).status).toBe(409);
    expect((await asA().post(`${base}/recipes`, { recipeId: other.id, scale: 1 })).status).toBe(409);
    expect((await asA().put(`${base}/recipes/${recipe.id}`, { scale: 2 })).status).toBe(409);
    expect((await asA().del(`${base}/recipes/${recipe.id}`)).status).toBe(409);

    const del = await asA().del(base);
    expect(del.status).toBe(409);
    expect(del.body.error).toMatch(/Cannot delete a completed production sheet/);

    const still = ok<Sheet & { notes: string }>(await asA().get(`${base}?include=recipes`));
    expect(still.notes).toBe('Morning bake');
    expect(recipeIdsOf(still)).toEqual([recipe.id]);
  });

  it('deletes an open sheet', async () => {
    const { recipe } = await makeRecipe();
    const sheet = await makeSheet([recipe.id]);
    ok(await asA().del(`/production-sheets/${sheet.id}`));
    expect((await asA().get(`/production-sheets/${sheet.id}`)).status).toBe(404);
  });

  it("returns 404 for another bakery's sheet", async () => {
    const { recipe } = await makeRecipe();
    const sheet = await makeSheet([recipe.id]);
    const { recipe: theirs } = await makeRecipe(asB());
    const base = `/production-sheets/${sheet.id}`;

    expect((await asB().get(base)).status).toBe(404);
    expect((await asB().put(base, { notes: 'Hijacked' })).status).toBe(404);
    expect((await asB().del(base)).status).toBe(404);
    expect((await asB().post(`${base}/recipes`, { recipeId: theirs.id, scale: 1 })).status).toBe(404);
    expect((await asB().put(`${base}/recipes/${recipe.id}`, { scale: 2 })).status).toBe(404);
    expect((await asB().del(`${base}/recipes/${recipe.id}`)).status).toBe(404);

    const still = ok<Sheet & { notes: string }>(await asA().get(`${base}?include=recipes`));
    expect(still.notes).toBe('Morning bake');
  });

  it('searches by description and notes', async () => {
    const { recipe } = await makeRecipe();
    const description = unique('Searchable sheet');
    const sheet = await makeSheet([recipe.id], description);

    const byDescription = ok<Sheet[]>(
      await asA().get(`/production-sheets?search=${encodeURIComponent(description)}`)
    );
    expect(byDescription.map((s) => s.id)).toEqual([sheet.id]);

    const byNotes = ok<Sheet[]>(await asA().get('/production-sheets?search=morning%20bake&limit=100'));
    expect(byNotes.map((s) => s.id)).toContain(sheet.id);

    // Another bakery's search never sees it.
    const theirs = ok<Sheet[]>(
      await asB().get(`/production-sheets?search=${encodeURIComponent(description)}`)
    );
    expect(theirs).toHaveLength(0);
  });

  it('requires write scope for the recipe endpoints', async () => {
    const { recipe } = await makeRecipe();
    const sheet = await makeSheet([recipe.id]);
    const res = await asAReadOnly().put(`/production-sheets/${sheet.id}/recipes/${recipe.id}`, {
      scale: 2,
    });
    expect(res.status).toBe(403);
  });
});
