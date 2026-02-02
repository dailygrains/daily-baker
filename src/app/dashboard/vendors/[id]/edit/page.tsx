import { getCurrentUser } from '@/lib/clerk';
import { redirect, notFound } from 'next/navigation';
import { VendorEditPageContent } from '@/components/vendors/VendorEditPageContent';
import { getVendorById } from '@/app/actions/vendor';

export default async function EditVendorPage({
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

  const vendorResult = await getVendorById(id);

  if (!vendorResult.success || !vendorResult.data) {
    notFound();
  }

  const vendor = vendorResult.data;

  return (
    <VendorEditPageContent
      bakeryId={user.bakeryId}
      vendor={vendor}
    />
  );
}
