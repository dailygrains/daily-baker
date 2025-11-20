import { getCurrentUser } from '@/lib/clerk';
import { redirect } from 'next/navigation';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { PageHeader } from '@/components/ui/PageHeader';
import { getBakeSheetsByBakery } from '@/app/actions/bakeSheet';
import Link from 'next/link';
import { Plus, Briefcase, CheckCircle2, Clock } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';

export default async function BakeSheetsPage() {
  const user = await getCurrentUser();

  if (!user) {
    redirect('/sign-in');
  }

  if (!user.bakeryId) {
    redirect('/dashboard');
  }

  const bakeSheetsResult = await getBakeSheetsByBakery(user.bakeryId);

  if (!bakeSheetsResult.success) {
    return (
      <DashboardLayout isPlatformAdmin={user.isPlatformAdmin}>
        <div className="alert alert-error">
          <span>{bakeSheetsResult.error}</span>
        </div>
      </DashboardLayout>
    );
  }

  const bakeSheets = bakeSheetsResult.data;

  // Separate pending and completed
  const pendingBakeSheets = bakeSheets.filter((bs) => !bs.completed);
  const completedBakeSheets = bakeSheets.filter((bs) => bs.completed);

  return (
    <DashboardLayout isPlatformAdmin={user.isPlatformAdmin}>
      <div className="space-y-6">
        <PageHeader
          title="Bake Sheets"
          description="Manage production runs and track ingredient usage"
          action={
            <Link
              href="/dashboard/bake-sheets/new"
              className="btn btn-primary btn-sm"
            >
              <Plus className="h-4 w-4" />
              New Bake Sheet
            </Link>
          }
        />

        {/* Stats */}
        <div className="stats stats-vertical lg:stats-horizontal shadow w-full">
          <div className="stat">
            <div className="stat-figure text-warning">
              <Clock className="h-8 w-8" />
            </div>
            <div className="stat-title">Pending</div>
            <div className="stat-value text-warning">{pendingBakeSheets.length}</div>
            <div className="stat-desc">Waiting to be completed</div>
          </div>

          <div className="stat">
            <div className="stat-figure text-success">
              <CheckCircle2 className="h-8 w-8" />
            </div>
            <div className="stat-title">Completed</div>
            <div className="stat-value text-success">{completedBakeSheets.length}</div>
            <div className="stat-desc">Production runs finished</div>
          </div>

          <div className="stat">
            <div className="stat-figure text-primary">
              <Briefcase className="h-8 w-8" />
            </div>
            <div className="stat-title">Total</div>
            <div className="stat-value text-primary">{bakeSheets.length}</div>
            <div className="stat-desc">All bake sheets</div>
          </div>
        </div>

        {/* Pending Bake Sheets */}
        {pendingBakeSheets.length > 0 && (
          <div className="card bg-base-100 shadow-xl">
            <div className="card-body">
              <h2 className="card-title">Pending Bake Sheets</h2>

              <div className="overflow-x-auto">
                <table className="table">
                  <thead>
                    <tr>
                      <th>Recipe</th>
                      <th>Quantity</th>
                      <th>Scale</th>
                      <th>Created</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {pendingBakeSheets.map((bakeSheet) => (
                      <tr key={bakeSheet.id}>
                        <td>
                          <Link
                            href={`/dashboard/bake-sheets/${bakeSheet.id}`}
                            className="font-semibold hover:text-primary"
                          >
                            {bakeSheet.recipe.name}
                          </Link>
                        </td>
                        <td>{bakeSheet.quantity}</td>
                        <td>
                          <span className="badge badge-outline">
                            {Number(bakeSheet.scale).toFixed(2)}x
                          </span>
                        </td>
                        <td className="text-sm text-base-content/70">
                          {formatDistanceToNow(new Date(bakeSheet.createdAt), {
                            addSuffix: true,
                          })}
                        </td>
                        <td>
                          <Link
                            href={`/dashboard/bake-sheets/${bakeSheet.id}`}
                            className="btn btn-sm btn-ghost"
                          >
                            View
                          </Link>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* Completed Bake Sheets */}
        {completedBakeSheets.length > 0 && (
          <div className="card bg-base-100 shadow-xl">
            <div className="card-body">
              <h2 className="card-title">Completed Bake Sheets</h2>

              <div className="overflow-x-auto">
                <table className="table">
                  <thead>
                    <tr>
                      <th>Recipe</th>
                      <th>Quantity</th>
                      <th>Scale</th>
                      <th>Completed</th>
                      <th>Completed By</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {completedBakeSheets.map((bakeSheet) => (
                      <tr key={bakeSheet.id}>
                        <td>
                          <Link
                            href={`/dashboard/bake-sheets/${bakeSheet.id}`}
                            className="font-semibold hover:text-primary"
                          >
                            {bakeSheet.recipe.name}
                          </Link>
                        </td>
                        <td>{bakeSheet.quantity}</td>
                        <td>
                          <span className="badge badge-outline">
                            {Number(bakeSheet.scale).toFixed(2)}x
                          </span>
                        </td>
                        <td className="text-sm text-base-content/70">
                          {bakeSheet.completedAt &&
                            formatDistanceToNow(new Date(bakeSheet.completedAt), {
                              addSuffix: true,
                            })}
                        </td>
                        <td className="text-sm text-base-content/70">
                          {bakeSheet.completer?.name || 'Unknown'}
                        </td>
                        <td>
                          <Link
                            href={`/dashboard/bake-sheets/${bakeSheet.id}`}
                            className="btn btn-sm btn-ghost"
                          >
                            View
                          </Link>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* Empty State */}
        {bakeSheets.length === 0 && (
          <div className="card bg-base-100 shadow-xl">
            <div className="card-body">
              <div className="text-center py-12">
                <Briefcase className="h-16 w-16 mx-auto text-base-content/30 mb-4" />
                <h3 className="text-lg font-semibold mb-2">No bake sheets yet</h3>
                <p className="text-base-content/70 mb-4">
                  Create a bake sheet to start a production run
                </p>
                <Link
                  href="/dashboard/bake-sheets/new"
                  className="btn btn-primary"
                >
                  <Plus className="h-4 w-4" />
                  Create Bake Sheet
                </Link>
              </div>
            </div>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
