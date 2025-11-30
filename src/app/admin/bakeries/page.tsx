import { getCurrentUser } from '@/lib/clerk';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { PageHeader } from '@/components/ui/PageHeader';
import { EmptyState } from '@/components/ui/EmptyState';
import { redirect } from 'next/navigation';
import { getAllBakeries } from '@/app/actions/bakery';
import { Wheat, Plus } from 'lucide-react';
import Link from 'next/link';
import { BakeriesTable } from '@/components/bakery/BakeriesTable';

export default async function BakeriesPage() {
  const user = await getCurrentUser();

  if (!user) {
    redirect('/sign-in');
  }

  if (!user.isPlatformAdmin) {
    redirect('/dashboard');
  }

  const result = await getAllBakeries();

  if (!result.success) {
    return (
      <DashboardLayout
        userName={user.name || undefined}
        userEmail={user.email}
        isPlatformAdmin={true}
        bakeries={user.allBakeries}
        currentBakeryId={user.bakeryId}
      >
        <PageHeader
          title="Bakeries"
          description="Manage all bakeries on the platform"
        />
        <div className="alert alert-error">
          <span>{result.error}</span>
        </div>
      </DashboardLayout>
    );
  }

  const bakeries = result.data || [];

  return (
    <DashboardLayout
      userName={user.name || undefined}
      userEmail={user.email}
      isPlatformAdmin={true}
        bakeries={user.allBakeries}
        currentBakeryId={user.bakeryId}
    >
      <PageHeader
        title="Bakeries"
        sticky
        actions={
          <Link href="/admin/bakeries/new" className="btn btn-primary">
            <Plus className="h-5 w-5 mr-2" />
            New Bakery
          </Link>
        }
      />

      {bakeries.length === 0 ? (
        <EmptyState
          icon={Wheat}
          title="No bakeries yet"
          description="Create your first bakery to get started with the platform."
          action={
            <Link href="/admin/bakeries/new" className="btn btn-primary">
              <Plus className="h-5 w-5 mr-2" />
              Create First Bakery
            </Link>
          }
        />
      ) : (
        <BakeriesTable bakeries={bakeries} />
      )}
    </DashboardLayout>
  );
}
