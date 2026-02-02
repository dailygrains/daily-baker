import { getCurrentUser } from '@/lib/clerk';
import { SetPageHeader } from '@/components/layout/SetPageHeader';
import { BakeryForm } from '@/components/bakery/BakeryForm';
import { redirect } from 'next/navigation';

export default async function NewBakeryPage() {
  const user = await getCurrentUser();

  if (!user) {
    redirect('/sign-in');
  }

  if (!user.isPlatformAdmin) {
    redirect('/dashboard');
  }

  return (
    
      <>
        <SetPageHeader
        title="Create New Bakery"
        description="Add a new bakery to the platform"
        breadcrumbs={[
          { label: 'Bakeries', href: '/admin/bakeries' },
          { label: 'New' },
        ]}
      />

      <BakeryForm mode="create" />
    </>
  );
}
