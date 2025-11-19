import { getCurrentUser } from '@/lib/clerk';
import { redirect } from 'next/navigation';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { PageHeader } from '@/components/ui/PageHeader';
import { IngredientForm } from '@/components/ingredients/IngredientForm';
import { db } from '@/lib/db';

export default async function NewIngredientPage() {
  const user = await getCurrentUser();

  if (!user) {
    redirect('/sign-in');
  }

  if (!user.bakeryId) {
    redirect('/dashboard');
  }

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
          title="Add New Ingredient"
          description="Add a new ingredient to your inventory"
        />

        <div className="card bg-base-100 shadow-xl">
          <div className="card-body">
            <IngredientForm bakeryId={user.bakeryId} vendors={vendors} />
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
