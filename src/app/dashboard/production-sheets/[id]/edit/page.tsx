import { getCurrentUser } from '@/lib/clerk';
import { redirect } from 'next/navigation';
import { SetPageHeader } from '@/components/layout/SetPageHeader';
import { ProductionSheetForm } from '@/components/productionSheets/ProductionSheetForm';
import { getProductionSheetById } from '@/app/actions/productionSheet';
import { db } from '@/lib/db';

export default async function EditProductionSheetPage({
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

  // Fetch the production sheet
  const productionSheetResult = await getProductionSheetById(id);

  if (!productionSheetResult.success || !productionSheetResult.data) {
    redirect('/dashboard/production-sheets');
  }

  const productionSheet = productionSheetResult.data;

  // Cannot edit completed production sheet
  if (productionSheet.completed) {
    redirect(`/dashboard/production-sheets/${id}`);
  }

  // Fetch all recipes for the form
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

  // Prepare existing sheet data for the form
  const existingSheet = {
    id: productionSheet.id,
    description: productionSheet.description,
    scheduledFor: productionSheet.scheduledFor,
    notes: productionSheet.notes,
    recipes: productionSheet.recipes.map((r) => ({
      recipeId: r.recipeId,
      scale: Number(r.scale),
      order: r.order,
    })),
  };

  // Get recipe names for breadcrumb
  const recipeNames = productionSheet.recipes.map((r) => r.recipe.name).join(', ');

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <SetPageHeader
        title="Edit Production Sheet"
        description="Modify the production sheet details and recipes"
        breadcrumbs={[
          { label: 'Production Sheets', href: '/dashboard/production-sheets' },
          {
            label: productionSheet.description || recipeNames,
            href: `/dashboard/production-sheets/${id}`,
          },
          { label: 'Edit' },
        ]}
      />

      <div className="card bg-base-100 shadow-xl">
        <div className="card-body">
          <ProductionSheetForm
            bakeryId={user.bakeryId}
            recipes={recipesForForm}
            existingSheet={existingSheet}
          />
        </div>
      </div>
    </div>
  );
}
