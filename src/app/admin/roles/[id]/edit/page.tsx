import { getCurrentUser } from '@/lib/clerk';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { PageHeader } from '@/components/ui/PageHeader';
import { RoleEditPageContent } from '@/components/role/RoleEditPageContent';
import { getRoleById } from '@/app/actions/role';
import { redirect } from 'next/navigation';

export default async function EditRolePage({
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
  const roleResult = await getRoleById(id);

  if (!roleResult.success || !roleResult.data) {
    return (
      <DashboardLayout
        userName={user.name || undefined}
        userEmail={user.email}
        isPlatformAdmin={true}
        bakeries={user.allBakeries}
        currentBakeryId={user.bakeryId}
      >
        <PageHeader title="Edit Role" />
        <div className="alert alert-error">
          <span>{roleResult.error || 'Role not found'}</span>
        </div>
      </DashboardLayout>
    );
  }

  const role = roleResult.data;

  return (
    <RoleEditPageContent
      role={role}
      isPlatformAdmin={user.isPlatformAdmin}
    />
  );
}
