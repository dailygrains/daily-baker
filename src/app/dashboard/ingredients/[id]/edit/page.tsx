import { getCurrentUser } from '@/lib/clerk';
import { redirect } from 'next/navigation';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { PageHeader } from '@/components/ui/PageHeader';
import { IngredientForm } from '@/components/ingredients/IngredientForm';
import { getIngredientById } from '@/app/actions/ingredient';
import { db } from '@/lib/db';

export default async function EditIngredientPage({
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

  const ingredientResult = await getIngredientById(id);

  if (!ingredientResult.success || !ingredientResult.data) {
    redirect('/dashboard/ingredients');
  }

  const ingredient = ingredientResult.data;

  // Fetch vendors for the dropdown
  const vendors = await db.vendor.findMany({
    where: { bakeryId: user.bakeryId },
    select: {
      id: true,
      name: true,
    },
    orderBy: {
      name: 'asc',
    },
  });

  return (
    <DashboardLayout isPlatformAdmin={user.isPlatformAdmin}>
      <div className="max-w-2xl mx-auto space-y-6">
        <PageHeader
          title="Edit Ingredient"
          description={`Update details for ${ingredient.name}`}
        />

        <div className="card bg-base-100 shadow-xl">
          <div className="card-body">
            <IngredientForm
              bakeryId={user.bakeryId}
              ingredient={ingredient}
              vendors={vendors}
            />
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
