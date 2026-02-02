import { getCurrentUser } from '@/lib/clerk';
import { redirect } from 'next/navigation';
import { SetPageHeader } from '@/components/layout/SetPageHeader';
import { VendorForm } from '@/components/vendors/VendorForm';

export default async function NewVendorPage() {
  const user = await getCurrentUser();

  if (!user) {
    redirect('/sign-in');
  }

  if (!user.bakeryId) {
    redirect('/dashboard');
  }

  return (
    <>
      <SetPageHeader
        title="Add New Vendor"
        breadcrumbs={[
          { label: 'Vendors', href: '/dashboard/vendors' },
          { label: 'New Vendor' },
        ]}
      />

      <VendorForm bakeryId={user.bakeryId} />
    </>
  );
}
