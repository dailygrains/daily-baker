import { getCurrentUser } from '@/lib/clerk';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { PageHeader } from '@/components/ui/PageHeader';
import { EmptyState } from '@/components/ui/EmptyState';
import { redirect } from 'next/navigation';
import { getAllUsers } from '@/app/actions/user';
import { Users, Edit, Wheat } from 'lucide-react';
import Link from 'next/link';

export default async function UsersPage() {
  const user = await getCurrentUser();

  if (!user) {
    redirect('/sign-in');
  }

  if (!user.isPlatformAdmin) {
    redirect('/dashboard');
  }

  const result = await getAllUsers();

  if (!result.success) {
    return (
      <DashboardLayout isPlatformAdmin={true}>
        <PageHeader
          title="Users"
          description="Manage all users on the platform"
        />
        <div className="alert alert-error">
          <span>{result.error}</span>
        </div>
      </DashboardLayout>
    );
  }

  const users = result.data || [];

  return (
    <DashboardLayout isPlatformAdmin={true}>
      <PageHeader
        title="Users"
        description="Manage all users on the platform"
      />

      {users.length === 0 ? (
        <EmptyState
          icon={Users}
          title="No users yet"
          description="Users will appear here once they sign up."
        />
      ) : (
        <div className="card bg-base-100 shadow-sm">
          <div className="overflow-x-auto">
            <table className="table">
              <thead>
                <tr>
                  <th>Name</th>
                  <th>Email</th>
                  <th>Bakery</th>
                  <th>Role</th>
                  <th>Joined</th>
                  <th className="text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {users.map((u) => (
                  <tr key={u.id} className="hover">
                    <td>
                      <div className="flex items-center gap-3">
                        <div className="avatar placeholder">
                          <div className="bg-neutral text-neutral-content rounded-full w-10">
                            <span className="text-sm">
                              {u.name?.charAt(0).toUpperCase() || u.email.charAt(0).toUpperCase()}
                            </span>
                          </div>
                        </div>
                        <div>
                          <div className="font-bold">{u.name || 'Not set'}</div>
                          {u.id === user.id && (
                            <span className="badge badge-primary badge-sm">You</span>
                          )}
                        </div>
                      </div>
                    </td>
                    <td>{u.email}</td>
                    <td>
                      {u.bakery ? (
                        <div className="flex items-center gap-2">
                          <Wheat className="h-4 w-4 text-primary" />
                          <span>{u.bakery.name}</span>
                        </div>
                      ) : (
                        <span className="text-base-content/40 italic">No bakery</span>
                      )}
                    </td>
                    <td>
                      {u.role ? (
                        <span className="badge badge-outline">{u.role.name}</span>
                      ) : (
                        <span className="text-base-content/40 italic">No role</span>
                      )}
                    </td>
                    <td>
                      <div className="text-sm">
                        {new Date(u.createdAt).toLocaleDateString()}
                      </div>
                    </td>
                    <td className="text-right">
                      <Link
                        href={`/admin/users/${u.id}/edit`}
                        className="btn btn-sm btn-ghost"
                      >
                        <Edit className="h-4 w-4" />
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      <div className="mt-6">
        <div className="stats stats-vertical md:stats-horizontal shadow bg-base-100">
          <div className="stat">
            <div className="stat-title">Total Users</div>
            <div className="stat-value">{users.length}</div>
          </div>

          <div className="stat">
            <div className="stat-title">Assigned to Bakeries</div>
            <div className="stat-value">
              {users.filter((u) => u.bakeryId).length}
            </div>
          </div>

          <div className="stat">
            <div className="stat-title">With Roles</div>
            <div className="stat-value">
              {users.filter((u) => u.roleId).length}
            </div>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
