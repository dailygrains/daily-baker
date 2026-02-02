import { getCurrentUser } from '@/lib/clerk';
import { redirect } from 'next/navigation';
import { SetPageHeader } from '@/components/layout/SetPageHeader';
import { getProductionSheetsByBakery } from '@/app/actions/productionSheet';
import Link from 'next/link';
import { Plus, Briefcase, CheckCircle2, Clock } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';

export default async function ProductionSheetsPage() {
  const user = await getCurrentUser();

  if (!user) {
    redirect('/sign-in');
  }

  if (!user.bakeryId) {
    redirect('/dashboard');
  }

  const productionSheetsResult = await getProductionSheetsByBakery(user.bakeryId);

  if (!productionSheetsResult.success) {
    return (
      <div className="alert alert-error">
          <span>{productionSheetsResult.error}</span>
        </div>
    );
  }

  const productionSheets = productionSheetsResult.data || [];

  // Separate pending and completed
  const pendingProductionSheets = productionSheets.filter((ps) => !ps.completed);
  const completedProductionSheets = productionSheets.filter((ps) => ps.completed);

  return (
    <div className="space-y-6">
        <SetPageHeader
          title="Production Sheets"
          description="Manage production runs and track ingredient usage"
          actions={
            <Link
              href="/dashboard/production-sheets/new"
              className="btn btn-primary btn-sm"
            >
              <Plus className="h-4 w-4" />
              New Production Sheet
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
            <div className="stat-value text-warning">{pendingProductionSheets.length}</div>
            <div className="stat-desc">Waiting to be completed</div>
          </div>

          <div className="stat">
            <div className="stat-figure text-success">
              <CheckCircle2 className="h-8 w-8" />
            </div>
            <div className="stat-title">Completed</div>
            <div className="stat-value text-success">{completedProductionSheets.length}</div>
            <div className="stat-desc">Production runs finished</div>
          </div>

          <div className="stat">
            <div className="stat-figure text-primary">
              <Briefcase className="h-8 w-8" />
            </div>
            <div className="stat-title">Total</div>
            <div className="stat-value text-primary">{productionSheets.length}</div>
            <div className="stat-desc">All production sheets</div>
          </div>
        </div>

        {/* Pending Production Sheets */}
        {pendingProductionSheets.length > 0 && (
          <div className="card bg-base-100 shadow-xl">
            <div className="card-body">
              <h2 className="card-title">Pending Production Sheets</h2>

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
                    {pendingProductionSheets.map((productionSheet) => (
                      <tr key={productionSheet.id}>
                        <td>
                          <Link
                            href={`/dashboard/production-sheets/${productionSheet.id}`}
                            className="font-semibold hover:text-primary"
                          >
                            {productionSheet.recipe.name}
                          </Link>
                        </td>
                        <td>{productionSheet.quantity}</td>
                        <td>
                          <span className="badge badge-outline">
                            {Number(productionSheet.scale).toFixed(2)}x
                          </span>
                        </td>
                        <td className="text-sm text-base-content/70">
                          {formatDistanceToNow(new Date(productionSheet.createdAt), {
                            addSuffix: true,
                          })}
                        </td>
                        <td>
                          <Link
                            href={`/dashboard/production-sheets/${productionSheet.id}`}
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

        {/* Completed Production Sheets */}
        {completedProductionSheets.length > 0 && (
          <div className="card bg-base-100 shadow-xl">
            <div className="card-body">
              <h2 className="card-title">Completed Production Sheets</h2>

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
                    {completedProductionSheets.map((productionSheet) => (
                      <tr key={productionSheet.id}>
                        <td>
                          <Link
                            href={`/dashboard/production-sheets/${productionSheet.id}`}
                            className="font-semibold hover:text-primary"
                          >
                            {productionSheet.recipe.name}
                          </Link>
                        </td>
                        <td>{productionSheet.quantity}</td>
                        <td>
                          <span className="badge badge-outline">
                            {Number(productionSheet.scale).toFixed(2)}x
                          </span>
                        </td>
                        <td className="text-sm text-base-content/70">
                          {productionSheet.completedAt &&
                            formatDistanceToNow(new Date(productionSheet.completedAt), {
                              addSuffix: true,
                            })}
                        </td>
                        <td className="text-sm text-base-content/70">
                          {productionSheet.completer?.name || 'Unknown'}
                        </td>
                        <td>
                          <Link
                            href={`/dashboard/production-sheets/${productionSheet.id}`}
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
        {productionSheets.length === 0 && (
          <div className="card bg-base-100 shadow-xl">
            <div className="card-body">
              <div className="text-center py-12">
                <Briefcase className="h-16 w-16 mx-auto text-base-content/30 mb-4" />
                <h3 className="text-lg font-semibold mb-2">No production sheets yet</h3>
                <p className="text-base-content/70 mb-4">
                  Create a production sheet to start a production run
                </p>
                <Link
                  href="/dashboard/production-sheets/new"
                  className="btn btn-primary"
                >
                  <Plus className="h-4 w-4" />
                  Create Production Sheet
                </Link>
              </div>
            </div>
          </div>
        )}
      </div>
  );
}
