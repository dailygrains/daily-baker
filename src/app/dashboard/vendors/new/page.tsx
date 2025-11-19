import { getCurrentUser } from '@/lib/clerk';
import { redirect } from 'next/navigation';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { PageHeader } from '@/components/ui/PageHeader';
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
    <DashboardLayout isPlatformAdmin={user.isPlatformAdmin}>
      <div className="max-w-2xl mx-auto space-y-6">
        <PageHeader
          title="Add New Vendor"
          description="Add a new supplier or service provider"
        />

        <div className="card bg-base-100 shadow-xl">
          <div className="card-body">
            <VendorForm bakeryId={user.bakeryId} />
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
