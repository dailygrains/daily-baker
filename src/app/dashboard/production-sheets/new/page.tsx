import { getCurrentUser } from '@/lib/clerk';
import { redirect } from 'next/navigation';
import { ProductionSheetNewPageContent } from '@/components/productionSheets/ProductionSheetNewPageContent';
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
      yieldQty: true,
      yieldUnit: true,
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
    <ProductionSheetNewPageContent
      bakeryId={user.bakeryId}
      recipes={recipesForForm}
    />
  );
}
