import { getCurrentUser } from '@/lib/clerk';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { PageHeader } from '@/components/ui/PageHeader';
import { UserAssignmentForm } from '@/components/user/UserAssignmentForm';
import { getUserById, getAllRoles } from '@/app/actions/user';
import { getAllBakeries } from '@/app/actions/bakery';
import { redirect } from 'next/navigation';
import { ArrowLeft } from 'lucide-react';
import Link from 'next/link';

export default async function EditUserPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const currentUser = await getCurrentUser();

  if (!currentUser) {
    redirect('/sign-in');
  }

  if (!currentUser.isPlatformAdmin) {
    redirect('/dashboard');
  }

  const { id } = await params;

  const [userResult, bakeriesResult, rolesResult] = await Promise.all([
    getUserById(id),
    getAllBakeries(),
    getAllRoles(),
  ]);

  if (!userResult.success || !userResult.data) {
    return (
      <DashboardLayout isPlatformAdmin={true}>
        <PageHeader title="Edit User" />
        <div className="alert alert-error">
          <span>{userResult.error || 'User not found'}</span>
        </div>
      </DashboardLayout>
    );
  }

  const user = userResult.data;
  const bakeries = bakeriesResult.success ? bakeriesResult.data || [] : [];
  const roles = rolesResult.success ? rolesResult.data || [] : [];

  return (
    <DashboardLayout isPlatformAdmin={true}>
      <PageHeader
        title={`Edit User: ${user.name || user.email}`}
        description="Manage user bakery and role assignments"
        actions={
          <Link href="/admin/users" className="btn btn-ghost">
            <ArrowLeft className="h-5 w-5 mr-2" />
            Back to Users
          </Link>
        }
      />

      <UserAssignmentForm user={user} bakeries={bakeries} roles={roles} />
    </DashboardLayout>
  );
}
