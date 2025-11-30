import { getCurrentUser } from '@/lib/clerk';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { PageHeader } from '@/components/ui/PageHeader';
import { EmptyState } from '@/components/ui/EmptyState';
import { redirect } from 'next/navigation';
import { getAllRoles } from '@/app/actions/user';
import { Shield, Plus } from 'lucide-react';
import Link from 'next/link';
import { RolesTable } from '@/components/role/RolesTable';

export default async function RolesPage() {
  const user = await getCurrentUser();

  if (!user) {
    redirect('/sign-in');
  }

  if (!user.isPlatformAdmin) {
    redirect('/dashboard');
  }

  const rolesResult = await getAllRoles();

  if (!rolesResult.success) {
    return (
      <DashboardLayout
        userName={user.name || undefined}
        userEmail={user.email}
        isPlatformAdmin={true}
        bakeries={user.allBakeries}
        currentBakeryId={user.bakeryId}
      >
        <PageHeader title="Platform Roles" />
        <div className="alert alert-error">
          <span>{rolesResult.error || 'Failed to load roles'}</span>
        </div>
      </DashboardLayout>
    );
  }

  const roles = rolesResult.data || [];

  return (
    <DashboardLayout
      userName={user.name || undefined}
      userEmail={user.email}
      isPlatformAdmin={true}
        bakeries={user.allBakeries}
        currentBakeryId={user.bakeryId}
    >
      <PageHeader
        title="Platform Roles"
        sticky
        actions={
          <Link href="/admin/roles/new" className="btn btn-primary">
            <Plus className="h-5 w-5 mr-2" />
            New Role
          </Link>
        }
      />

      {roles.length === 0 ? (
        <EmptyState
          icon={Shield}
          title="No roles yet"
          description="Create roles to define permissions for team members."
          action={
            <Link href="/admin/roles/new" className="btn btn-primary">
              <Plus className="h-5 w-5 mr-2" />
              Create First Role
            </Link>
          }
        />
      ) : (
        <RolesTable
          roles={roles.map(role => ({
            ...role,
            permissions: role.permissions as Record<string, boolean>
          }))}
        />
      )}
    </DashboardLayout>
  );
}
