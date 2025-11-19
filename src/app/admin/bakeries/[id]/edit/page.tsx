import { getCurrentUser } from '@/lib/clerk';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { PageHeader } from '@/components/ui/PageHeader';
import { BakeryForm } from '@/components/bakery/BakeryForm';
import { getBakeryById } from '@/app/actions/bakery';
import { redirect } from 'next/navigation';
import { ArrowLeft } from 'lucide-react';
import Link from 'next/link';

export default async function EditBakeryPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const user = await getCurrentUser();

  if (!user) {
    redirect('/sign-in');
  }

  if (!user.isPlatformAdmin) {
    redirect('/dashboard');
  }

  const { id } = await params;
  const result = await getBakeryById(id);

  if (!result.success || !result.data) {
    return (
      <DashboardLayout isPlatformAdmin={true}>
        <PageHeader title="Edit Bakery" />
        <div className="alert alert-error">
          <span>{result.error || 'Bakery not found'}</span>
        </div>
      </DashboardLayout>
    );
  }

  const bakery = result.data;

  return (
    <DashboardLayout isPlatformAdmin={true}>
      <PageHeader
        title={`Edit ${bakery.name}`}
        description="Update bakery information"
        actions={
          <Link href="/admin/bakeries" className="btn btn-ghost">
            <ArrowLeft className="h-5 w-5 mr-2" />
            Back to Bakeries
          </Link>
        }
      />

      <BakeryForm bakery={bakery} mode="edit" />
    </DashboardLayout>
  );
}
