import { Decimal } from '@prisma/client/runtime/library';
import { db } from '@/lib/db';
import { calculateRecipeCost } from '@/lib/recipeCost';
import { recipeSnapshotService, type RecipeEntity } from '@/lib/snapshot';
import {
  createRecipeSchema,
  updateRecipeSchema,
  type RecipeSectionInput,
} from '@/lib/validations/recipe';
import {
  ServiceError,
  assertAllOwned,
  logActivity,
  notFound,
  requireBakery,
  type ServiceContext,
} from './context';

const recipeInclude = {
  sections: {
    orderBy: { order: 'asc' as const },
    include: {
      ingredients: {
        include: { ingredient: true },
        orderBy: { order: 'asc' as const },
      },
    },
  },
};

function nestedSections(sections: RecipeSectionInput[]) {
  return {
    create: sections.map((section) => ({
      name: section.name,
      order: section.order,
      instructions: section.instructions,
      useBakersMath: section.useBakersMath,
      bakersMathBaseIndices: section.bakersMathBaseIndices,
      ingredients: {
        create: section.ingredients.map((ing, ingIndex) => ({
          ingredientId: ing.ingredientId,
          quantity: new Decimal(ing.quantity),
          unit: ing.unit,
          preparation: ing.preparation || null,
          order: ing.order ?? ingIndex,
        })),
      },
    })),
  };
}

function assertIngredientsOwned(sections: RecipeSectionInput[], bakeryId: string) {
  return assertAllOwned(
    'ingredient',
    sections.flatMap((s) => s.ingredients.map((i) => i.ingredientId)),
    bakeryId,
    'Ingredient'
  );
}

type RecipeWithSections = NonNullable<
  Awaited<ReturnType<typeof db.recipe.findFirst<{ include: typeof recipeInclude }>>>
>;

async function snapshot(ctx: ServiceContext, recipe: RecipeWithSections) {
  try {
    const entity: RecipeEntity = {
      id: recipe.id,
      name: recipe.name,
      description: recipe.description,
      yieldQty: recipe.yieldQty,
      yieldUnit: recipe.yieldUnit,
      totalCost: recipe.totalCost,
      sections: recipe.sections.map((section) => ({
        id: section.id,
        name: section.name,
        order: section.order,
        instructions: section.instructions,
        ingredients: section.ingredients.map((ing) => ({
          id: ing.id,
          quantity: ing.quantity,
          unit: ing.unit,
          ingredient: { id: ing.ingredient.id, name: ing.ingredient.name, unit: ing.ingredient.unit },
        })),
      })),
    };
    await recipeSnapshotService.createSnapshot(
      entity,
      recipe.bakeryId,
      recipe.id,
      recipe.name,
      'SAVE',
      ctx.userId ?? undefined
    );
  } catch (error) {
    // A failed snapshot must not fail the save.
    console.error('Failed to create recipe snapshot:', error);
  }
}

export async function createRecipe(ctx: ServiceContext, input: unknown) {
  const bakeryId = requireBakery(ctx);
  const data = createRecipeSchema.parse({ ...(input as object), bakeryId });
  await assertIngredientsOwned(data.sections, bakeryId);

  const totalCost = await calculateRecipeCost(data.sections);

  const recipe = await db.recipe.create({
    data: {
      bakeryId,
      name: data.name,
      description: data.description || null,
      yieldQty: data.yieldQty,
      yieldUnit: data.yieldUnit,
      totalCost: new Decimal(totalCost),
      sections: nestedSections(data.sections),
    },
    include: recipeInclude,
  });

  await logActivity(ctx, {
    action: 'CREATE',
    entityType: 'recipe',
    entityId: recipe.id,
    entityName: recipe.name,
    description: `Created recipe "${recipe.name}"`,
    metadata: {
      recipeId: recipe.id,
      yield: `${recipe.yieldQty} ${recipe.yieldUnit}`,
      sectionCount: recipe.sections.length,
    },
  });
  await snapshot(ctx, recipe);

  return recipe;
}

export async function updateRecipe(ctx: ServiceContext, id: string, input: unknown) {
  const bakeryId = requireBakery(ctx);
  const data = updateRecipeSchema.parse({ ...(input as object), id });

  const existing = await db.recipe.findFirst({ where: { id, bakeryId }, select: { id: true } });
  if (!existing) throw notFound('Recipe');

  if (data.sections) {
    await assertIngredientsOwned(data.sections, bakeryId);
  }
  const totalCost = data.sections ? await calculateRecipeCost(data.sections) : undefined;

  // Delete + recreate sections atomically so a failed write keeps the old ones.
  const recipe = await db.$transaction(async (tx) => {
    if (data.sections) {
      await tx.recipeSection.deleteMany({ where: { recipeId: id } });
    }
    return tx.recipe.update({
      where: { id },
      data: {
        name: data.name,
        description: data.description,
        yieldQty: data.yieldQty,
        yieldUnit: data.yieldUnit,
        ...(totalCost !== undefined && { totalCost: new Decimal(totalCost) }),
        ...(data.sections && { sections: nestedSections(data.sections) }),
      },
      include: recipeInclude,
    });
  });

  await logActivity(ctx, {
    action: 'UPDATE',
    entityType: 'recipe',
    entityId: recipe.id,
    entityName: recipe.name,
    description: `Updated recipe "${recipe.name}"`,
    metadata: { recipeId: recipe.id, changes: data },
  });
  await snapshot(ctx, recipe);

  return recipe;
}

export async function deleteRecipe(ctx: ServiceContext, id: string) {
  const bakeryId = requireBakery(ctx);
  const recipe = await db.recipe.findFirst({
    where: { id, bakeryId },
    include: { _count: { select: { productionSheetRecipes: true, products: true } } },
  });
  if (!recipe) throw notFound('Recipe');

  const { productionSheetRecipes, products } = recipe._count;
  if (productionSheetRecipes > 0) {
    throw new ServiceError(
      409,
      `Cannot delete recipe with ${productionSheetRecipes} production sheet(s). Please remove from production sheets first.`
    );
  }
  if (products > 0) {
    throw new ServiceError(
      409,
      `Cannot delete recipe used by ${products} product(s). Please change or delete those products first.`
    );
  }

  // Tag assignments have no foreign key to the tagged row, so remove them here.
  await db.$transaction([
    db.entityTag.deleteMany({ where: { entityType: 'recipe', entityId: id } }),
    db.recipe.delete({ where: { id } }),
  ]);

  await logActivity(ctx, {
    action: 'DELETE',
    entityType: 'recipe',
    entityId: recipe.id,
    entityName: recipe.name,
    description: `Deleted recipe "${recipe.name}"`,
    metadata: { recipeId: recipe.id },
  });

  return recipe;
}
