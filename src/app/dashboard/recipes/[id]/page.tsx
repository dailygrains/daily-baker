import { getCurrentUser } from '@/lib/clerk';
import { redirect } from 'next/navigation';
import { SetPageHeader } from '@/components/layout/SetPageHeader';
import { getRecipeById } from '@/app/actions/recipe';
import { getTagsForEntity } from '@/app/actions/tag';
import Link from 'next/link';
import { calculateIngredientCost } from '@/lib/unitConvert';
import { RecipeDetailContent } from '@/components/recipes/RecipeDetailContent';
import { RecipeDetailSidebar } from '@/components/recipes/RecipeDetailSidebar';

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

  // Fetch tags for this recipe
  const tagsResult = await getTagsForEntity('recipe', id);
  const tags = (tagsResult.success && tagsResult.data ? tagsResult.data : []).map((t) => ({
    id: t.id,
    name: t.name,
    color: t.color,
  }));

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

      <div className="flex flex-col lg:flex-row gap-8">
        {/* Main Content */}
        <div className="flex-1 min-w-0">
          <RecipeDetailContent recipe={recipe} />
        </div>

        {/* Sidebar */}
        <div className="w-full lg:w-80 flex-shrink-0">
          <RecipeDetailSidebar
            recipe={recipe}
            totalCost={totalCost}
            costPerUnit={costPerUnit}
            totalIngredients={totalIngredients}
            tags={tags}
          />
        </div>
      </div>
    </>
  );
}
