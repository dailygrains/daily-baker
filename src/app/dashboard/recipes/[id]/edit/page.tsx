import { getCurrentUser } from '@/lib/clerk';
import { redirect } from 'next/navigation';
import { RecipeEditPageContent } from '@/components/recipes/RecipeEditPageContent';
import { getRecipeById } from '@/app/actions/recipe';
import { db } from '@/lib/db';

export default async function EditRecipePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const user = await getCurrentUser();
  const { id } = await params;

  if (!user) {
    redirect('/sign-in');
  }

  if (!user.bakeryId) {
    redirect('/dashboard');
  }

  const recipeResult = await getRecipeById(id);

  if (!recipeResult.success || !recipeResult.data) {
    redirect('/dashboard/recipes');
  }

  const recipe = recipeResult.data;

  // Serialize Decimal values for client component
  const serializedRecipe = {
    id: recipe.id,
    name: recipe.name,
    description: recipe.description,
    yieldQty: recipe.yieldQty,
    yieldUnit: recipe.yieldUnit,
    createdAt: recipe.createdAt,
    updatedAt: recipe.updatedAt,
    bakeryId: recipe.bakeryId,
    totalCost: recipe.totalCost.toString(),
    sections: recipe.sections.map(section => ({
      id: section.id,
      name: section.name,
      order: section.order,
      instructions: section.instructions,
      useBakersMath: section.useBakersMath,
      bakersMathBaseIndex: section.bakersMathBaseIndex,
      recipeId: section.recipeId,
      ingredients: section.ingredients.map(ing => ({
        id: ing.id,
        ingredientId: ing.ingredientId,
        quantity: ing.quantity.toString(),
        unit: ing.unit,
        preparation: ing.preparation,
        sectionId: ing.sectionId,
        ingredient: {
          id: ing.ingredient.id,
          name: ing.ingredient.name,
          unit: ing.ingredient.unit,
          costPerUnit: Number(ing.ingredient.costPerUnit),
        },
      })),
    })),
  };

  // Fetch available ingredients for the dropdown
  const ingredients = await db.ingredient.findMany({
    where: { bakeryId: user.bakeryId },
    select: {
      id: true,
      name: true,
      unit: true,
    },
    orderBy: {
      name: 'asc',
    },
  });

  return (
    <RecipeEditPageContent
      bakeryId={user.bakeryId}
      recipe={serializedRecipe}
      availableIngredients={ingredients}
    />
  );
}
