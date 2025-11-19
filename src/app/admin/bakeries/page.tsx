import { getCurrentUser } from '@/lib/clerk';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { PageHeader } from '@/components/ui/PageHeader';
import { EmptyState } from '@/components/ui/EmptyState';
import { redirect } from 'next/navigation';
import { getAllBakeries } from '@/app/actions/bakery';
import { Wheat, Plus, Users, BookOpen, Trash2, Edit } from 'lucide-react';
import Link from 'next/link';

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
      <DashboardLayout isPlatformAdmin={true}>
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
    <DashboardLayout isPlatformAdmin={true}>
      <PageHeader
        title="Bakeries"
        description="Manage all bakeries on the platform"
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
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {bakeries.map((bakery) => (
            <div key={bakery.id} className="card bg-base-100 shadow-sm hover:shadow-md transition-shadow">
              <div className="card-body">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <div className="avatar placeholder">
                      <div className="bg-primary text-primary-content rounded-lg w-12">
                        <Wheat className="h-6 w-6" />
                      </div>
                    </div>
                    <div>
                      <h3 className="card-title text-lg">{bakery.name}</h3>
                      {bakery.description && (
                        <p className="text-sm text-base-content/60 line-clamp-2 mt-1">
                          {bakery.description}
                        </p>
                      )}
                    </div>
                  </div>
                </div>

                <div className="stats stats-vertical shadow-sm mt-4 bg-base-200">
                  <div className="stat py-3">
                    <div className="stat-figure text-primary">
                      <Users className="h-5 w-5" />
                    </div>
                    <div className="stat-title text-xs">Users</div>
                    <div className="stat-value text-2xl">{bakery._count.users}</div>
                  </div>

                  <div className="stat py-3">
                    <div className="stat-figure text-secondary">
                      <BookOpen className="h-5 w-5" />
                    </div>
                    <div className="stat-title text-xs">Recipes</div>
                    <div className="stat-value text-2xl">{bakery._count.recipes}</div>
                  </div>
                </div>

                {(bakery.address || bakery.phone || bakery.email || bakery.website) && (
                  <div className="divider my-2"></div>
                )}

                <div className="space-y-1 text-sm">
                  {bakery.address && (
                    <p className="text-base-content/70">{bakery.address}</p>
                  )}
                  {bakery.phone && (
                    <p className="text-base-content/70">{bakery.phone}</p>
                  )}
                  {bakery.email && (
                    <p className="text-base-content/70">{bakery.email}</p>
                  )}
                  {bakery.website && (
                    <a
                      href={bakery.website}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="link link-primary text-sm"
                    >
                      {bakery.website}
                    </a>
                  )}
                </div>

                <div className="card-actions justify-end mt-4">
                  <Link
                    href={`/admin/bakeries/${bakery.id}/edit`}
                    className="btn btn-sm btn-ghost"
                  >
                    <Edit className="h-4 w-4" />
                  </Link>
                  <form action={`/admin/bakeries/${bakery.id}/delete`} method="POST">
                    <button
                      type="submit"
                      className="btn btn-sm btn-ghost text-error"
                      disabled={bakery._count.users > 0}
                      title={bakery._count.users > 0 ? 'Cannot delete bakery with active users' : 'Delete bakery'}
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </form>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </DashboardLayout>
  );
}
