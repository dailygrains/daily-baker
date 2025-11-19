import { getCurrentUser } from '@/lib/clerk';
import { redirect } from 'next/navigation';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { PageHeader } from '@/components/ui/PageHeader';
import { RecipeForm } from '@/components/recipes/RecipeForm';
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
    <DashboardLayout isPlatformAdmin={user.isPlatformAdmin}>
      <div className="max-w-4xl mx-auto space-y-6">
        <PageHeader
          title="Edit Recipe"
          description={`Update details for ${recipe.name}`}
        />

        <div className="card bg-base-100 shadow-xl">
          <div className="card-body">
            <RecipeForm
              bakeryId={user.bakeryId}
              recipe={recipe}
              availableIngredients={ingredients}
            />
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
