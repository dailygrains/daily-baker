import { getCurrentUser } from '@/lib/clerk';
import { redirect } from 'next/navigation';
import { SetPageHeader } from '@/components/layout/SetPageHeader';
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
      <SetPageHeader
        title="Recipes"
        description="Create and manage your bakery recipes"
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
        <div className="space-y-6">
          {/* Stats */}
          <div className="card bg-base-100 p-4">
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
              <div>
                <p className="text-sm text-base-content/70">Total Recipes</p>
                <p className="text-2xl font-bold text-primary">{totalRecipes}</p>
              </div>
              <div>
                <p className="text-sm text-base-content/70">Total Cost</p>
                <p className="text-2xl font-bold text-success">${totalCost}</p>
              </div>
              <div>
                <p className="text-sm text-base-content/70">Average Cost</p>
                <p className="text-2xl font-bold">${avgCost}</p>
              </div>
            </div>
          </div>

          <RecipesTable recipes={serializedRecipes} />
        </div>
      )}
    </>
  );
}
