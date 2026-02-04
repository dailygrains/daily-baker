import { getCurrentUser } from '@/lib/clerk';
import { redirect } from 'next/navigation';
import { SetPageHeader } from '@/components/layout/SetPageHeader';
import { getRecipeById } from '@/app/actions/recipe';
import Link from 'next/link';
import { calculateIngredientCost } from '@/lib/unitConvert';
import { RecipeDetailTabs } from '@/components/recipes/RecipeDetailTabs';
import { RecipeDetailContent } from '@/components/recipes/RecipeDetailContent';

export default async function RecipeDetailPage({
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

  // Calculate total cost on-the-fly from ingredients with proper unit conversion
  const totalCost = recipe.sections.reduce((sectionSum, section) => {
    return sectionSum + section.ingredients.reduce((ingSum, ing) => {
      const cost = calculateIngredientCost(
        Number(ing.quantity),
        ing.unit,
        Number(ing.ingredient.costPerUnit),
        ing.ingredient.unit
      );
      return ingSum + (cost ?? 0);
    }, 0);
  }, 0);

  // Calculate cost per unit
  const costPerUnit = recipe.yieldQty > 0 ? totalCost / recipe.yieldQty : 0;

  // Count total ingredients
  const totalIngredients = recipe.sections.reduce(
    (sum, section) => sum + section.ingredients.length,
    0
  );

  return (
    <>
      <SetPageHeader
        title={recipe.name}
        sticky
        breadcrumbs={[
          { label: 'Recipes', href: '/dashboard/recipes' },
          { label: recipe.name },
        ]}
        actions={
          <Link
            href={`/dashboard/recipes/${id}/edit`}
            className="btn btn-primary"
          >
            Edit
          </Link>
        }
      />

      <RecipeDetailTabs
        recipeId={recipe.id}
        bakeryId={recipe.bakeryId}
        detailsContent={
          <RecipeDetailContent
            recipe={recipe}
            totalCost={totalCost}
            costPerUnit={costPerUnit}
            totalIngredients={totalIngredients}
          />
        }
      />
    </>
  );
}
