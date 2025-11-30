import { getCurrentUser } from '@/lib/clerk';
import { redirect } from 'next/navigation';
import { PageHeader } from '@/components/ui/PageHeader';
import { RecipeForm } from '@/components/recipes/RecipeForm';
import { db } from '@/lib/db';
import Link from 'next/link';

export default async function NewRecipePage() {
  const user = await getCurrentUser();

  if (!user) {
    redirect('/sign-in');
  }

  if (!user.bakeryId) {
    redirect('/dashboard');
  }

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
    <div className="max-w-4xl mx-auto space-y-6">
        <PageHeader
          title="Add New Recipe"
          description="Create a new recipe with ingredients and instructions"
        />

        <div className="card bg-base-100 shadow-xl">
          <div className="card-body">
            {ingredients.length === 0 ? (
              <div className="text-center py-8">
                <h3 className="text-xl font-bold mb-2">No ingredients available</h3>
                <p className="text-base-content/70 mb-4">
                  You need to add ingredients before creating recipes
                </p>
                <Link href="/dashboard/ingredients/new" className="btn btn-primary">
                  Add Ingredients
                </Link>
              </div>
            ) : (
              <RecipeForm bakeryId={user.bakeryId} availableIngredients={ingredients} />
            )}
          </div>
        </div>
      </div>
  );
}
