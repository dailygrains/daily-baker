import { Decimal } from '@prisma/client/runtime/library';
import { db } from '@/lib/db';
import {
  createProductionSheetSchema,
  updateProductionSheetSchema,
  addRecipeToSheetSchema,
  updateRecipeOnSheetSchema,
  removeRecipeFromSheetSchema,
  type ProductionSheetRecipeInput,
} from '@/lib/validations/productionSheet';
import { checkInventoryLevels, type InventoryWithLots } from '@/lib/inventory';
import {
  getProductionSheetIngredientRequirements,
  type ProductionSheetRecipeEntry,
} from '@/lib/ingredientAggregation';
import { productionSheetSnapshotService, buildProductionSheetEntity } from '@/lib/snapshot';
import {
  ServiceError,
  assertAllOwned,
  logActivity,
  notFound,
  requireBakery,
  type ServiceContext,
} from './context';

export type InventoryWarning = ReturnType<typeof checkInventoryLevels>[number];

/** Recipe include used for inventory checks and snapshots. */
const recipeWithIngredientsInclude = {
  sections: {
    include: {
      ingredients: {
        include: {
          ingredient: {
            include: {
              inventory: {
                include: {
                  lots: {
                    where: { remainingQty: { gt: 0 } },
                    orderBy: { purchasedAt: 'asc' as const },
                  },
                },
              },
            },
          },
        },
      },
    },
  },
};

/** Shape returned to callers: the sheet with its ordered recipe entries. */
const sheetInclude = {
  recipes: {
    orderBy: { order: 'asc' as const },
    include: { recipe: { select: { id: true, name: true } } },
  },
};

type RecipeWithIngredients = NonNullable<
  Awaited<ReturnType<typeof db.recipe.findFirst<{ include: typeof recipeWithIngredientsInclude }>>>
>;

function toRecipeEntry(
  recipe: RecipeWithIngredients,
  entry: { id: string; scale: number | Decimal; order: number }
): ProductionSheetRecipeEntry {
  return {
    id: entry.id,
    scale: entry.scale,
    order: entry.order,
    recipe: {
      id: recipe.id,
      name: recipe.name,
      yieldQty: recipe.yieldQty,
      yieldUnit: recipe.yieldUnit,
      totalCost: recipe.totalCost,
      sections: recipe.sections.map((s) => ({
        id: s.id,
        name: s.name,
        order: s.order,
        ingredients: s.ingredients.map((i) => ({
          id: i.id,
          quantity: i.quantity,
          unit: i.unit,
          ingredient: i.ingredient,
        })),
      })),
    },
  };
}

/**
 * Compare aggregated ingredient needs against FIFO inventory. Shortfalls are
 * warnings only: the sheet is still saved.
 */
function inventoryWarnings(
  recipes: RecipeWithIngredients[],
  entries: ProductionSheetRecipeEntry[]
): InventoryWarning[] {
  const inventoryByIngredient = new Map<string, InventoryWithLots>();
  for (const recipe of recipes) {
    for (const section of recipe.sections) {
      for (const { ingredient } of section.ingredients) {
        if (inventoryByIngredient.has(ingredient.id)) continue;
        if (ingredient.inventory && ingredient.inventory.lots.length > 0) {
          inventoryByIngredient.set(ingredient.id, {
            id: ingredient.inventory.id,
            displayUnit: ingredient.inventory.displayUnit,
            lots: ingredient.inventory.lots.map((lot) => ({
              id: lot.id,
              purchaseQty: lot.purchaseQty,
              remainingQty: lot.remainingQty,
              purchaseUnit: lot.purchaseUnit,
              costPerUnit: lot.costPerUnit,
              purchasedAt: lot.purchasedAt,
              expiresAt: lot.expiresAt,
              vendorId: lot.vendorId,
              notes: lot.notes,
            })),
          });
        }
      }
    }
  }

  return checkInventoryLevels(
    getProductionSheetIngredientRequirements(entries).map((req) => ({
      ingredientId: req.ingredientId,
      ingredientName: req.ingredientName,
      requiredQuantity: req.requiredQuantity,
      requiredUnit: req.requiredUnit,
      inventory: inventoryByIngredient.get(req.ingredientId) ?? null,
    }))
  );
}

/** Reject recipe lists that reference another tenant or repeat a recipe. */
async function assertRecipeList(recipes: ProductionSheetRecipeInput[], bakeryId: string) {
  const ids = recipes.map((r) => r.recipeId);
  if (new Set(ids).size !== ids.length) {
    throw new ServiceError(422, 'Each recipe can only appear once on a production sheet');
  }
  await assertAllOwned('recipe', ids, bakeryId, 'Recipe');
}

/** Find a sheet owned by the bakery, or 404. */
async function findSheet(id: string, bakeryId: string) {
  const sheet = await db.productionSheet.findFirst({
    where: { id, bakeryId },
    select: { id: true, bakeryId: true, completed: true, description: true },
  });
  if (!sheet) throw notFound('Production sheet');
  return sheet;
}

/** Find an editable (not completed) sheet owned by the bakery. */
async function findOpenSheet(id: string, bakeryId: string, message: string) {
  const sheet = await findSheet(id, bakeryId);
  if (sheet.completed) throw new ServiceError(409, message);
  return sheet;
}

/** Save a snapshot of the sheet's current recipes. Never fails the write. */
async function snapshot(ctx: ServiceContext, sheetId: string) {
  try {
    const full = await db.productionSheet.findUnique({
      where: { id: sheetId },
      include: {
        recipes: {
          include: { recipe: { include: recipeWithIngredientsInclude } },
          orderBy: { order: 'asc' },
        },
      },
    });
    if (!full) return;

    const entity = buildProductionSheetEntity({
      id: full.id,
      description: full.description,
      recipes: full.recipes.map((r) => toRecipeEntry(r.recipe, r)),
    });
    const recipeNames = full.recipes.map((r) => r.recipe.name).join(', ');

    await productionSheetSnapshotService.createSnapshot(
      entity,
      full.bakeryId,
      full.id,
      full.description || recipeNames,
      'SAVE',
      ctx.userId ?? undefined
    );
  } catch (error) {
    console.error('Failed to create production sheet snapshot:', error);
  }
}

const loadSheet = (id: string) =>
  db.productionSheet.findUniqueOrThrow({ where: { id }, include: sheetInclude });

export async function createProductionSheet(ctx: ServiceContext, input: unknown) {
  const bakeryId = requireBakery(ctx);
  const data = createProductionSheetSchema.parse({ ...(input as object), bakeryId });

  await assertRecipeList(data.recipes, bakeryId);

  const recipes = await db.recipe.findMany({
    where: { id: { in: data.recipes.map((r) => r.recipeId) }, bakeryId },
    include: recipeWithIngredientsInclude,
  });
  const byId = new Map(recipes.map((r) => [r.id, r]));

  const entries = data.recipes.map((r, idx) =>
    toRecipeEntry(byId.get(r.recipeId)!, { id: '', scale: r.scale, order: r.order ?? idx })
  );
  const warnings = inventoryWarnings(recipes, entries);

  const created = await db.$transaction(async (tx) => {
    const sheet = await tx.productionSheet.create({
      data: {
        bakeryId,
        description: data.description || null,
        scheduledFor: data.scheduledFor || null,
        notes: data.notes || null,
        completed: false,
      },
    });

    await tx.productionSheetRecipe.createMany({
      data: data.recipes.map((r, idx) => ({
        productionSheetId: sheet.id,
        recipeId: r.recipeId,
        scale: new Decimal(r.scale),
        order: r.order ?? idx,
      })),
    });

    return sheet;
  });

  const recipeNames = data.recipes.map((r) => byId.get(r.recipeId)!.name).join(', ');

  await logActivity(ctx, {
    action: 'CREATE',
    entityType: 'production_sheet',
    entityId: created.id,
    entityName: data.description || `${recipes.length} recipe(s)`,
    description: `Created production sheet with ${recipes.length} recipe(s): ${recipeNames}${warnings.length > 0 ? ` (${warnings.length} inventory warning(s))` : ''}`,
    metadata: {
      recipes: data.recipes,
      recipeNames,
      scheduledFor: data.scheduledFor,
      inventoryWarnings: warnings.length > 0 ? warnings : undefined,
    },
  });

  await snapshot(ctx, created.id);

  return { sheet: await loadSheet(created.id), warnings };
}

export async function updateProductionSheet(ctx: ServiceContext, id: string, input: unknown) {
  const bakeryId = requireBakery(ctx);
  const data = updateProductionSheetSchema.parse({ ...(input as object), id });

  await findOpenSheet(id, bakeryId, 'Cannot update a completed production sheet');
  if (data.recipes) await assertRecipeList(data.recipes, bakeryId);

  await db.$transaction(async (tx) => {
    await tx.productionSheet.update({
      where: { id },
      data: {
        description: data.description,
        scheduledFor: data.scheduledFor,
        notes: data.notes,
      },
    });

    // A submitted recipe list replaces the existing one.
    if (data.recipes) {
      await tx.productionSheetRecipe.deleteMany({ where: { productionSheetId: id } });
      await tx.productionSheetRecipe.createMany({
        data: data.recipes.map((r, idx) => ({
          productionSheetId: id,
          recipeId: r.recipeId,
          scale: new Decimal(r.scale),
          order: r.order ?? idx,
        })),
      });
    }
  });

  await logActivity(ctx, {
    action: 'UPDATE',
    entityType: 'production_sheet',
    entityId: id,
    entityName: `Production sheet ${id.substring(0, 8)}`,
    description: 'Updated production sheet',
  });

  await snapshot(ctx, id);

  return loadSheet(id);
}

export async function deleteProductionSheet(ctx: ServiceContext, id: string) {
  const bakeryId = requireBakery(ctx);
  const sheet = await db.productionSheet.findFirst({
    where: { id, bakeryId },
    select: {
      completed: true,
      description: true,
      recipes: { include: { recipe: { select: { name: true } } } },
    },
  });
  if (!sheet) throw notFound('Production sheet');

  // Completed sheets own inventory usage history; keep them.
  if (sheet.completed) {
    throw new ServiceError(409, 'Cannot delete a completed production sheet');
  }

  const recipeNames = sheet.recipes.map((r) => r.recipe.name).join(', ');

  // Recipe entries cascade.
  await db.productionSheet.delete({ where: { id } });

  await logActivity(ctx, {
    action: 'DELETE',
    entityType: 'production_sheet',
    entityId: id,
    entityName: sheet.description || recipeNames,
    description: `Deleted production sheet: ${sheet.description || recipeNames}`,
  });

  return { id };
}

/** Add one recipe to a sheet, after the last existing entry. */
export async function addRecipeToSheet(ctx: ServiceContext, sheetId: string, input: unknown) {
  const bakeryId = requireBakery(ctx);
  const data = addRecipeToSheetSchema.parse({ ...(input as object), productionSheetId: sheetId });

  await findOpenSheet(sheetId, bakeryId, 'Cannot modify a completed production sheet');
  await assertAllOwned('recipe', [data.recipeId], bakeryId, 'Recipe');

  const existing = await db.productionSheetRecipe.findMany({
    where: { productionSheetId: sheetId },
    select: { recipeId: true, order: true },
  });
  if (existing.some((r) => r.recipeId === data.recipeId)) {
    throw new ServiceError(409, 'Recipe is already on this production sheet');
  }

  const maxOrder = Math.max(0, ...existing.map((r) => r.order));

  return db.productionSheetRecipe.create({
    data: {
      productionSheetId: sheetId,
      recipeId: data.recipeId,
      scale: new Decimal(data.scale),
      order: maxOrder + 1,
    },
  });
}

async function findEntry(sheetId: string, recipeId: string) {
  const entry = await db.productionSheetRecipe.findUnique({
    where: { productionSheetId_recipeId: { productionSheetId: sheetId, recipeId } },
  });
  if (!entry) throw notFound('Recipe on this production sheet');
  return entry;
}

/** Change a recipe's scale or order on a sheet. */
export async function updateRecipeOnSheet(
  ctx: ServiceContext,
  sheetId: string,
  recipeId: string,
  input: unknown
) {
  const bakeryId = requireBakery(ctx);
  const data = updateRecipeOnSheetSchema.parse({
    ...(input as object),
    productionSheetId: sheetId,
    recipeId,
  });

  await findOpenSheet(sheetId, bakeryId, 'Cannot modify a completed production sheet');
  const entry = await findEntry(sheetId, recipeId);

  return db.productionSheetRecipe.update({
    where: { id: entry.id },
    data: {
      scale: data.scale !== undefined ? new Decimal(data.scale) : undefined,
      order: data.order,
    },
  });
}

/** Remove a recipe from a sheet. A sheet must keep at least one recipe. */
export async function removeRecipeFromSheet(ctx: ServiceContext, sheetId: string, recipeId: string) {
  const bakeryId = requireBakery(ctx);
  removeRecipeFromSheetSchema.parse({ productionSheetId: sheetId, recipeId });

  await findOpenSheet(sheetId, bakeryId, 'Cannot modify a completed production sheet');
  const entry = await findEntry(sheetId, recipeId);

  const count = await db.productionSheetRecipe.count({ where: { productionSheetId: sheetId } });
  if (count <= 1) {
    throw new ServiceError(409, 'Production sheet must have at least one recipe');
  }

  await db.productionSheetRecipe.delete({ where: { id: entry.id } });
  return { productionSheetId: sheetId, recipeId };
}
