import { getCurrentUser } from '@/lib/clerk';
import { redirect } from 'next/navigation';
import { getInventoryLotById } from '@/app/actions/inventory';
import { EditLotPageContent } from '@/components/inventory/EditLotPageContent';
import { db } from '@/lib/db';

export default async function EditLotPage({
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

  const lotResult = await getInventoryLotById(id);

  if (!lotResult.success || !lotResult.data) {
    redirect('/dashboard/ingredients');
  }

  const lot = lotResult.data;

  // Fetch vendors for dropdown
  const vendors = await db.vendor.findMany({
    where: { bakeryId: user.bakeryId },
    select: { id: true, name: true },
    orderBy: { name: 'asc' },
  });

  return (
    <EditLotPageContent
      lot={lot}
      vendors={vendors}
    />
  );
}
