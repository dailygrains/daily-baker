import { getCurrentUser } from '@/lib/clerk';
import { redirect } from 'next/navigation';
import { SetPageHeader } from '@/components/layout/SetPageHeader';
import { SupplyForm } from '@/components/supply/SupplyForm';
import { db } from '@/lib/db';

export default async function NewSupplyPage() {
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
    <div className="space-y-6">
      <SetPageHeader
        title="Add New Supply"
        description="Track a new bakery supply item"
      />

      <div className="card bg-base-100 shadow-xl">
        <div className="card-body">
          <SupplyForm bakeryId={user.bakeryId} vendors={vendors} />
        </div>
      </div>
    </div>
  );
}
