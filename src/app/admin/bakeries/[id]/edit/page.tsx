import { getCurrentUser } from '@/lib/clerk';
import { getBakeryById } from '@/app/actions/bakery';
import { redirect } from 'next/navigation';
import { BakeryEditPageContent } from '@/components/bakery/BakeryEditPageContent';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { PageHeader } from '@/components/ui/PageHeader';

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
    <BakeryEditPageContent
      bakery={bakery}
      isPlatformAdmin={user.isPlatformAdmin}
    />
  );
}
