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

  // Fetch inventory items for the form
  const inventoryItems = await db.inventoryItem.findMany({
    where: { bakeryId: user.bakeryId },
    include: {
      ingredient: {
        select: {
          id: true,
          name: true,
        },
      },
      vendor: {
        select: {
          id: true,
          name: true,
        },
      },
    },
    orderBy: [
      { ingredient: { name: 'asc' } },
      { createdAt: 'desc' },
    ],
  });

  // Convert Decimal to number for client component
  const inventoryItemsForForm = inventoryItems.map((item) => ({
    ...item,
    quantity: Number(item.quantity),
    purchasePrice: item.purchasePrice ? Number(item.purchasePrice) : null,
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
          description="Record a change to an inventory batch"
        />

        <div className="card bg-base-100 shadow-xl">
          <div className="card-body">
            <InventoryTransactionForm
              bakeryId={user.bakeryId}
              inventoryItems={inventoryItemsForForm}
            />
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
