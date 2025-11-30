import { getCurrentUser } from '@/lib/clerk';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { PageHeader } from '@/components/ui/PageHeader';
import { RoleForm } from '@/components/role/RoleForm';
import { getRoleById } from '@/app/actions/role';
import { redirect } from 'next/navigation';
import { ArrowLeft } from 'lucide-react';
import Link from 'next/link';

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
    <DashboardLayout
      userName={user.name || undefined}
      userEmail={user.email}
      isPlatformAdmin={true}
    >
      <PageHeader
        title={`Edit Platform Role: ${role.name}`}
        description="Update platform-wide role details and permissions"
        actions={
          <Link href="/admin/roles" className="btn btn-ghost">
            <ArrowLeft className="h-5 w-5 mr-2" />
            Back to Roles
          </Link>
        }
      />

      <RoleForm role={role} mode="edit" />
    </DashboardLayout>
  );
}
