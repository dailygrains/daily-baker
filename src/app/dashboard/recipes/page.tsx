import { getCurrentUser } from '@/lib/clerk';
import { redirect } from 'next/navigation';
import { PageHeader } from '@/components/ui/PageHeader';
import { EmptyState } from '@/components/ui/EmptyState';
import { getRecipesByBakery } from '@/app/actions/recipe';
import { RecipesTable } from '@/components/recipes/RecipesTable';
import Link from 'next/link';
import { Plus, ChefHat } from 'lucide-react';

export default async function RecipesPage() {
  const user = await getCurrentUser();

  if (!user) {
    redirect('/sign-in');
  }

  if (!user.bakeryId) {
    redirect('/dashboard');
  }

  const recipesResult = await getRecipesByBakery(user.bakeryId);

  if (!recipesResult.success) {
    return (
      <>
        <PageHeader
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

  // Serialize Decimal values for client component
  const serializedRecipes = recipes.map(recipe => ({
    ...recipe,
    totalCost: recipe.totalCost.toString(),
  }));

  const totalRecipes = recipes.length;
  const totalCost = recipes.reduce((sum, r) => sum + Number(r.totalCost), 0).toFixed(2);
  const avgCost = totalRecipes > 0 ? (Number(totalCost) / totalRecipes).toFixed(2) : '0.00';

  return (
    <>
      <PageHeader
        title="Recipes"
        sticky
        actions={
          <Link href="/dashboard/recipes/new" className="btn btn-primary">
            <Plus className="h-5 w-5 mr-2" />
            Add Recipe
          </Link>
        }
      />

      {recipes.length === 0 ? (
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
      ) : (
        <>
          {/* Stats */}
          <div className="stats stats-horizontal shadow w-full">
            <div className="stat">
              <div className="stat-title">Total Recipes</div>
              <div className="stat-value text-primary">{totalRecipes}</div>
              <div className="stat-desc">Active recipes</div>
            </div>

            <div className="stat">
              <div className="stat-title">Total Cost</div>
              <div className="stat-value text-secondary">${totalCost}</div>
              <div className="stat-desc">Combined ingredient cost</div>
            </div>

            <div className="stat">
              <div className="stat-title">Average Cost</div>
              <div className="stat-value text-accent">${avgCost}</div>
              <div className="stat-desc">Per recipe</div>
            </div>
          </div>

          <RecipesTable recipes={serializedRecipes} />
        </>
      )}
    </>
  );
}
