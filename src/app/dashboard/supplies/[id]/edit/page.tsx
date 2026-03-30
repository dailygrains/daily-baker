import { getCurrentUser } from '@/lib/clerk';
import { redirect } from 'next/navigation';
import { getSupplyById } from '@/app/actions/supply';
import { SupplyEditPageContent } from '@/components/supply/SupplyEditPageContent';
import { db } from '@/lib/db';

export default async function EditSupplyPage({
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

  const supplyResult = await getSupplyById(id);

  if (!supplyResult.success || !supplyResult.data) {
    redirect('/dashboard/supplies');
  }

  const supply = {
    ...supplyResult.data,
    costPerUnit: Number(supplyResult.data.costPerUnit),
    quantityOnHand: Number(supplyResult.data.quantityOnHand),
    lowStockThreshold: supplyResult.data.lowStockThreshold
      ? Number(supplyResult.data.lowStockThreshold)
      : null,
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
    <SupplyEditPageContent
      bakeryId={user.bakeryId}
      supply={supply}
      vendors={vendors}
    />
  );
}
