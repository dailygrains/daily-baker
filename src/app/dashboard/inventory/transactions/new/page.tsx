import { getCurrentUser } from '@/lib/clerk';
import { redirect } from 'next/navigation';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { PageHeader } from '@/components/ui/PageHeader';
import { InventoryTransactionForm } from '@/components/inventory/InventoryTransactionForm';
import { db } from '@/lib/db';

export default async function NewInventoryTransactionPage() {
  const user = await getCurrentUser();

  if (!user) {
    redirect('/sign-in');
  }

  if (!user.bakeryId) {
    redirect('/dashboard');
  }

  // Fetch ingredients for the form
  const ingredients = await db.ingredient.findMany({
    where: { bakeryId: user.bakeryId },
    select: {
      id: true,
      name: true,
      unit: true,
      currentQty: true,
    },
    orderBy: {
      name: 'asc',
    },
  });

  // Convert Decimal to number for client component
  const ingredientsForForm = ingredients.map((ingredient) => ({
    ...ingredient,
    currentQty: Number(ingredient.currentQty),
  }));

  return (
    <DashboardLayout
        isPlatformAdmin={user.isPlatformAdmin}
        bakeries={user.allBakeries}
        currentBakeryId={user.bakeryId}
      >
      <div className="max-w-2xl mx-auto space-y-6">
        <PageHeader
          title="New Inventory Transaction"
          description="Record a change to your inventory"
        />

        <div className="card bg-base-100 shadow-xl">
          <div className="card-body">
            <InventoryTransactionForm
              bakeryId={user.bakeryId}
              ingredients={ingredientsForForm}
            />
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
