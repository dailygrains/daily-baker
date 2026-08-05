import { Decimal } from '@prisma/client/runtime/library';
import { db } from '@/lib/db';
import { calculateRecipeCost } from '@/lib/recipeCost';
import type { RecipeSectionInput } from '@/lib/validations/recipe';

/**
 * The recipe validators accept `sections` as a plain array, but Prisma needs it
 * wrapped in a nested `create`. These hooks do that translation and compute
 * `totalCost`, mirroring the createRecipe/updateRecipe server actions.
 */
function buildNestedSections(sections: RecipeSectionInput[]) {
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

export async function recipeBeforeCreate(data: Record<string, unknown>) {
  const sections = data.sections as RecipeSectionInput[];

  return {
    ...data,
    totalCost: new Decimal(await calculateRecipeCost(sections)),
    sections: buildNestedSections(sections),
  };
}

export async function recipeBeforeUpdate(id: string, data: Record<string, unknown>) {
  const sections = data.sections as RecipeSectionInput[] | undefined;

  if (!sections) return data;

  // Replace sections wholesale — cascade removes the old section ingredients
  await db.recipeSection.deleteMany({ where: { recipeId: id } });

  return {
    ...data,
    totalCost: new Decimal(await calculateRecipeCost(sections)),
    sections: buildNestedSections(sections),
  };
}
