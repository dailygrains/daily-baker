import { getCurrentUser } from '@/lib/clerk';
import { redirect } from 'next/navigation';
import { SetPageHeader } from '@/components/layout/SetPageHeader';
import { EmptyState } from '@/components/ui/EmptyState';
import { SearchFilterInput } from '@/components/ui/SearchFilterInput';
import { getRecipesByBakery } from '@/app/actions/recipe';
import { getTagsForEntity } from '@/app/actions/tag';
import { RecipesTable } from '@/components/recipes/RecipesTable';
import Link from 'next/link';
import { Plus, ChefHat } from 'lucide-react';

export default async function RecipesPage({
  searchParams,
}: {
  searchParams: Promise<{ search?: string }>;
}) {
  const user = await getCurrentUser();

  if (!user) {
    redirect('/sign-in');
  }

  if (!user.bakeryId) {
    redirect('/dashboard');
  }

  const { search } = await searchParams;
  const recipesResult = await getRecipesByBakery(user.bakeryId, search);

  if (!recipesResult.success) {
    return (
      <>
        <SetPageHeader
          title="Recipes"
          sticky
        />
        <div className="alert alert-error">
          <span>{recipesResult.error}</span>
        </div>
      </>
    );
  }

  const recipes = recipesResult.data || [];

  // Fetch tags for all recipes in parallel
  const recipeTags = await Promise.all(
    recipes.map((r) => getTagsForEntity('recipe', r.id))
  );

  // Serialize Decimal values for client component
  const serializedRecipes = recipes.map((recipe, i) => ({
    ...recipe,
    totalCost: recipe.totalCost.toString(),
    tags: (recipeTags[i].success && recipeTags[i].data ? recipeTags[i].data : []).map((t) => ({
      id: t.id,
      name: t.name,
      color: t.color,
    })),
  }));

  return (
    <>
      <SetPageHeader
        title="Recipes"
        description="Create and manage your bakery recipes"
        sticky
        centerContent={<SearchFilterInput placeholder="Search recipes..." />}
        actions={
          <Link href="/dashboard/recipes/new" className="btn btn-primary">
            <Plus className="h-5 w-5 mr-2" />
            Add Recipe
          </Link>
        }
      />

      {recipes.length === 0 ? (
        search ? (
          <EmptyState
            icon={ChefHat}
            title="No recipes found"
            description={`No recipes matching "${search}". Try a different search term.`}
          />
        ) : (
          <EmptyState
            icon={ChefHat}
            title="No recipes yet"
            description="Start by adding your first recipe to track costs and manage your bakery menu."
            action={
              <Link href="/dashboard/recipes/new" className="btn btn-primary">
                <Plus className="h-5 w-5 mr-2" />
                Add First Recipe
              </Link>
            }
          />
        )
      ) : (
        <RecipesTable key={search || ''} recipes={serializedRecipes} />
      )}
    </>
  );
}
