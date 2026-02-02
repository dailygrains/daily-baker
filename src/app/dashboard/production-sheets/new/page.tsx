import { getCurrentUser } from '@/lib/clerk';
import { redirect } from 'next/navigation';
import { SetPageHeader } from '@/components/layout/SetPageHeader';
import { ProductionSheetForm } from '@/components/productionSheets/ProductionSheetForm';
import { db } from '@/lib/db';

export default async function NewProductionSheetPage() {
  const user = await getCurrentUser();

  if (!user) {
    redirect('/sign-in');
  }

  if (!user.bakeryId) {
    redirect('/dashboard');
  }

  // Fetch recipes for the form
  const recipes = await db.recipe.findMany({
    where: { bakeryId: user.bakeryId },
    select: {
      id: true,
      name: true,
      totalCost: true,
    },
    orderBy: {
      name: 'asc',
    },
  });

  // Convert Decimal to number for client component
  const recipesForForm = recipes.map((recipe) => ({
    ...recipe,
    totalCost: recipe.totalCost ? Number(recipe.totalCost) : null,
  }));

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <SetPageHeader
        title="New Production Sheet"
        description="Create a production run for a recipe"
      />

      <div className="card bg-base-100 shadow-xl">
        <div className="card-body">
          <ProductionSheetForm bakeryId={user.bakeryId} recipes={recipesForForm} />
        </div>
      </div>
    </div>
  );
}
