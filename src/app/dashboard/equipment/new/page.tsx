import { getCurrentUser } from '@/lib/clerk';
import { redirect } from 'next/navigation';
import { SetPageHeader } from '@/components/layout/SetPageHeader';
import { EquipmentForm } from '@/components/equipment/EquipmentForm';
import { db } from '@/lib/db';

export default async function NewEquipmentPage() {
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
    <div className="max-w-2xl mx-auto space-y-6">
        <SetPageHeader
          title="Add New Equipment"
          description="Track a new piece of bakery equipment"
        />

        <div className="card bg-base-100 shadow-xl">
          <div className="card-body">
            <EquipmentForm bakeryId={user.bakeryId} vendors={vendors} />
          </div>
        </div>
      </div>
  );
}
