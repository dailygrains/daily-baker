import { describe, expect, it } from 'vitest';
import { asA, asAReadOnly, asB, ok, unique } from './client';
import { makeIngredient, makeRecipe } from './fixtures';

type Api = ReturnType<typeof asA>;

async function makeTagType(api: Api = asA()) {
  return ok<{ id: string; name: string }>(await api.post('/tag-types', { name: unique('Dietary') }));
}

async function makeTag(api: Api = asA(), tagTypeId?: string) {
  const typeId = tagTypeId ?? (await makeTagType(api)).id;
  return ok<{ id: string; name: string; tagTypeId: string }>(
    await api.post('/tags', { tagTypeId: typeId, name: unique('Vegan'), color: '#00aa00' })
  );
}

describe('tag types API', () => {
  it('creates, updates, reads and deletes a tag type', async () => {
    const tagType = await makeTagType();

    const updated = ok(await asA().put(`/tag-types/${tagType.id}`, { description: 'Diet', order: 3 }));
    expect(updated).toMatchObject({ id: tagType.id, description: 'Diet', order: 3 });

    const withTags = ok(await asA().get(`/tag-types/${tagType.id}?include=tags`));
    expect(withTags.tags).toEqual([]);

    ok(await asA().del(`/tag-types/${tagType.id}`));
    expect((await asA().get(`/tag-types/${tagType.id}`)).status).toBe(404);
  });

  it('rejects a duplicate name with 409', async () => {
    const tagType = await makeTagType();
    const res = await asA().post('/tag-types', { name: tagType.name });
    expect(res.status).toBe(409);
  });

  it('refuses to delete a tag type that still has tags', async () => {
    const tagType = await makeTagType();
    const tag = await makeTag(asA(), tagType.id);

    const res = await asA().del(`/tag-types/${tagType.id}`);
    expect(res.status).toBe(409);
    expect(res.body.error).toMatch(/Cannot delete tag type with 1 tag\(s\)/);

    // Nothing cascaded.
    ok(await asA().get(`/tags/${tag.id}`));
  });

  it("hides another bakery's tag types", async () => {
    const theirs = await makeTagType(asB());
    expect((await asA().get(`/tag-types/${theirs.id}`)).status).toBe(404);
    expect((await asA().put(`/tag-types/${theirs.id}`, { name: 'Hijacked' })).status).toBe(404);
    expect((await asA().del(`/tag-types/${theirs.id}`)).status).toBe(404);
  });
});

describe('tags API', () => {
  it('creates, updates, reads and deletes a tag', async () => {
    const tag = await makeTag();

    const updated = ok(await asA().put(`/tags/${tag.id}`, { name: 'Renamed tag', color: null }));
    expect(updated).toMatchObject({ id: tag.id, name: 'Renamed tag', color: null });
    expect(updated.tagType.id).toBe(tag.tagTypeId);

    const read = ok(await asA().get(`/tags/${tag.id}?include=tagType`));
    expect(read.tagType.id).toBe(tag.tagTypeId);

    ok(await asA().del(`/tags/${tag.id}`));
    expect((await asA().get(`/tags/${tag.id}`)).status).toBe(404);
  });

  it("rejects a tag type from another bakery and writes nothing", async () => {
    const theirs = await makeTagType(asB());
    const name = unique('Smuggled');

    const res = await asA().post('/tags', { tagTypeId: theirs.id, name });
    expect(res.status).toBe(422);
    expect(res.body.error).toMatch(/Tag type not found or belongs to another bakery/);

    const list = ok(await asA().get(`/tags?search=${encodeURIComponent(name)}`));
    expect(list).toHaveLength(0);
  });

  it('ignores tagTypeId on update (the type is fixed at creation)', async () => {
    const tag = await makeTag();
    const other = await makeTagType(asB());
    const updated = ok(await asA().put(`/tags/${tag.id}`, { tagTypeId: other.id }));
    expect(updated.tagTypeId).toBe(tag.tagTypeId);
  });

  it("hides another bakery's tags", async () => {
    const theirs = await makeTag(asB());
    expect((await asA().get(`/tags/${theirs.id}`)).status).toBe(404);
    expect((await asA().put(`/tags/${theirs.id}`, { name: 'Hijacked' })).status).toBe(404);
    expect((await asA().del(`/tags/${theirs.id}`)).status).toBe(404);
  });

  it('requires write scope', async () => {
    const tagType = await makeTagType();
    const res = await asAReadOnly().post('/tags', { tagTypeId: tagType.id, name: unique('Nope') });
    expect(res.status).toBe(403);
  });
});

describe('tag assignments API', () => {
  it('assigns and unassigns a tag on a recipe and an ingredient', async () => {
    const tag = await makeTag();
    const { recipe } = await makeRecipe();
    const ingredient = await makeIngredient();

    const onRecipe = ok(
      await asA().post(`/tags/${tag.id}/assignments`, { entityType: 'recipe', entityId: recipe.id })
    );
    expect(onRecipe).toMatchObject({ tagId: tag.id, entityType: 'recipe', entityId: recipe.id });
    ok(await asA().post(`/tags/${tag.id}/assignments`, { entityType: 'ingredient', entityId: ingredient.id }));

    const assignments = ok(await asA().get(`/tags/${tag.id}/assignments`));
    expect(assignments.map((a: { entityId: string }) => a.entityId).sort()).toEqual(
      [recipe.id, ingredient.id].sort()
    );

    const recipeTags = ok(await asA().get(`/entity-tags/recipe/${recipe.id}`));
    expect(recipeTags.map((t: { id: string }) => t.id)).toEqual([tag.id]);
    expect(recipeTags[0].tagType.id).toBe(tag.tagTypeId);

    const included = ok(await asA().get(`/tags/${tag.id}?include=entityTags`));
    expect(included.entityTags).toHaveLength(2);

    // Assigning twice is a conflict.
    const dup = await asA().post(`/tags/${tag.id}/assignments`, { entityType: 'recipe', entityId: recipe.id });
    expect(dup.status).toBe(409);

    ok(await asA().del(`/tags/${tag.id}/assignments/recipe/${recipe.id}`));
    expect(ok(await asA().get(`/entity-tags/recipe/${recipe.id}`))).toEqual([]);
    ok(await asA().del(`/tags/${tag.id}/assignments/ingredient/${ingredient.id}`));
    expect(ok(await asA().get(`/tags/${tag.id}/assignments`))).toEqual([]);

    // Removing a missing assignment is a 404.
    expect((await asA().del(`/tags/${tag.id}/assignments/recipe/${recipe.id}`)).status).toBe(404);
  });

  // 422, not 404: the foreign id arrives in the request body, which is how
  // every other cross-tenant reference is reported (assertAllOwned).
  it("rejects assigning to another bakery's entity with 422", async () => {
    const tag = await makeTag();
    const { recipe } = await makeRecipe(asB());
    const ingredient = await makeIngredient(asB());

    const r = await asA().post(`/tags/${tag.id}/assignments`, { entityType: 'recipe', entityId: recipe.id });
    expect(r.status).toBe(422);
    expect(r.body.error).toMatch(/Recipe not found or belongs to another bakery/);

    const i = await asA().post(`/tags/${tag.id}/assignments`, {
      entityType: 'ingredient',
      entityId: ingredient.id,
    });
    expect(i.status).toBe(422);
    expect(ok(await asA().get(`/tags/${tag.id}/assignments`))).toEqual([]);
  });

  it('rejects an unknown entity type', async () => {
    const tag = await makeTag();
    const { recipe } = await makeRecipe();
    const res = await asA().post(`/tags/${tag.id}/assignments`, { entityType: 'bakery', entityId: recipe.id });
    expect(res.status).toBe(422);
  });

  it("hides another bakery's tags and entities", async () => {
    const theirTag = await makeTag(asB());
    const { recipe: theirRecipe } = await makeRecipe(asB());
    const { recipe: ourRecipe } = await makeRecipe();

    expect(
      (await asA().post(`/tags/${theirTag.id}/assignments`, { entityType: 'recipe', entityId: ourRecipe.id }))
        .status
    ).toBe(404);
    expect((await asA().get(`/tags/${theirTag.id}/assignments`)).status).toBe(404);
    expect((await asA().get(`/entity-tags/recipe/${theirRecipe.id}`)).status).toBe(404);

    ok(await asB().post(`/tags/${theirTag.id}/assignments`, { entityType: 'recipe', entityId: theirRecipe.id }));
    expect((await asA().del(`/tags/${theirTag.id}/assignments/recipe/${theirRecipe.id}`)).status).toBe(404);
    expect(ok(await asB().get(`/entity-tags/recipe/${theirRecipe.id}`))).toHaveLength(1);
  });
});
