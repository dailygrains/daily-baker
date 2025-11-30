import { getCurrentUser } from '@/lib/clerk';
import { redirect } from 'next/navigation';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { PageHeader } from '@/components/ui/PageHeader';
import { EquipmentForm } from '@/components/equipment/EquipmentForm';
import { getEquipmentById } from '@/app/actions/equipment';
import { db } from '@/lib/db';

export default async function EditEquipmentPage({
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

  const equipmentResult = await getEquipmentById(id);

  if (!equipmentResult.success || !equipmentResult.data) {
    redirect('/dashboard/equipment');
  }

  const equipment = equipmentResult.data;

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
    <DashboardLayout
        isPlatformAdmin={user.isPlatformAdmin}
        bakeries={user.allBakeries}
        currentBakeryId={user.bakeryId}
      >
      <div className="max-w-2xl mx-auto space-y-6">
        <PageHeader
          title="Edit Equipment"
          description={`Update details for ${equipment.name}`}
        />

        <div className="card bg-base-100 shadow-xl">
          <div className="card-body">
            <EquipmentForm
              bakeryId={user.bakeryId}
              equipment={equipment}
              vendors={vendors}
            />
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
