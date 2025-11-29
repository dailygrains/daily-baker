import { getCurrentUser } from '@/lib/clerk';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { PageHeader } from '@/components/ui/PageHeader';
import { EmptyState } from '@/components/ui/EmptyState';
import { redirect } from 'next/navigation';
import { getBakeryById } from '@/app/actions/bakery';
import { getRolesByBakery } from '@/app/actions/role';
import { Shield, Plus, Edit, Trash2, Users } from 'lucide-react';
import Link from 'next/link';

export default async function BakeryRolesPage({
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

  const [bakeryResult, rolesResult] = await Promise.all([
    getBakeryById(id),
    getRolesByBakery(id),
  ]);

  if (!bakeryResult.success || !bakeryResult.data) {
    return (
      <DashboardLayout
        userName={user.name || undefined}
        userEmail={user.email}
        isPlatformAdmin={true}
      >
        <PageHeader title="Roles" />
        <div className="alert alert-error">
          <span>{bakeryResult.error || 'Bakery not found'}</span>
        </div>
      </DashboardLayout>
    );
  }

  const bakery = bakeryResult.data;
  const roles = rolesResult.success ? rolesResult.data || [] : [];

  return (
    <DashboardLayout
      userName={user.name || undefined}
      userEmail={user.email}
      isPlatformAdmin={true}
    >
      <PageHeader
        title={`Roles for ${bakery.name}`}
        description="Manage roles and permissions for this bakery"
        actions={
          <Link href={`/admin/bakeries/${id}/roles/new`} className="btn btn-primary">
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
            <Link href={`/admin/bakeries/${id}/roles/new`} className="btn btn-primary">
              <Plus className="h-5 w-5 mr-2" />
              Create First Role
            </Link>
          }
        />
      ) : (
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {roles.map((role) => (
            <div key={role.id} className="card bg-base-100 shadow-sm hover:shadow-md transition-shadow">
              <div className="card-body">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <div className="avatar placeholder">
                      <div className="bg-secondary text-secondary-content rounded-lg w-12">
                        <Shield className="h-6 w-6" />
                      </div>
                    </div>
                    <div>
                      <h3 className="card-title text-lg">{role.name}</h3>
                      {role.description && (
                        <p className="text-sm text-base-content/60 line-clamp-2 mt-1">
                          {role.description}
                        </p>
                      )}
                    </div>
                  </div>
                </div>

                <div className="stats shadow-sm mt-4 bg-base-200">
                  <div className="stat py-3">
                    <div className="stat-figure text-primary">
                      <Users className="h-5 w-5" />
                    </div>
                    <div className="stat-title text-xs">Users</div>
                    <div className="stat-value text-2xl">{role._count.users}</div>
                  </div>
                </div>

                <div className="divider my-2"></div>

                <div className="text-sm">
                  <p className="text-base-content/70 font-medium mb-1">Permissions:</p>
                  <p className="text-base-content/60">
                    {Object.values(role.permissions as Record<string, boolean>).filter(Boolean).length} enabled
                  </p>
                </div>

                <div className="card-actions justify-end mt-4">
                  <Link
                    href={`/admin/bakeries/${id}/roles/${role.id}/edit`}
                    className="btn btn-sm btn-ghost"
                  >
                    <Edit className="h-4 w-4" />
                  </Link>
                  <button
                    type="button"
                    className="btn btn-sm btn-ghost text-error"
                    disabled={role._count.users > 0}
                    title={role._count.users > 0 ? 'Cannot delete role with assigned users' : 'Delete role'}
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </DashboardLayout>
  );
}
