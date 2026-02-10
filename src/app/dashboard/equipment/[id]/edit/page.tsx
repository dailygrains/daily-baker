import { getCurrentUser } from '@/lib/clerk';
import { redirect } from 'next/navigation';
import { getEquipmentById } from '@/app/actions/equipment';
import { EquipmentEditPageContent } from '@/components/equipment/EquipmentEditPageContent';
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

  const equipment = {
    ...equipmentResult.data,
    cost: equipmentResult.data.cost ? Number(equipmentResult.data.cost) : null,
  };

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
    <EquipmentEditPageContent
      bakeryId={user.bakeryId}
      equipment={equipment}
      vendors={vendors}
    />
  );
}
