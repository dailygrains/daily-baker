import { getCurrentUser } from '@/lib/clerk';
import { redirect } from 'next/navigation';
import { RecipeNewPageContent } from '@/components/recipes/RecipeNewPageContent';
import { db } from '@/lib/db';
import { Plus } from 'lucide-react';
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

  if (ingredients.length === 0) {
    return (
      <div className="max-w-3xl mx-auto">
        <div className="card bg-base-100 shadow-xl">
          <div className="card-body text-center py-8">
            <h3 className="text-xl font-bold mb-2">No ingredients available</h3>
            <p className="text-base-content/70 mb-4">
              You need to add ingredients before creating recipes
            </p>
            <Link href="/dashboard/ingredients/new" className="btn btn-primary">
              <Plus className="h-5 w-5 mr-2" />
              Add Ingredients
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <RecipeNewPageContent
      bakeryId={user.bakeryId}
      availableIngredients={ingredients}
    />
  );
}
