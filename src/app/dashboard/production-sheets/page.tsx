import { getCurrentUser } from '@/lib/clerk';
import { redirect } from 'next/navigation';
import { SetPageHeader } from '@/components/layout/SetPageHeader';
import { getProductionSheetsByBakery } from '@/app/actions/productionSheet';
import Link from 'next/link';
import { Plus, Briefcase } from 'lucide-react';
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
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
          <div>
            <p className="text-sm text-base-content/70">Pending</p>
            <p className="text-2xl font-bold text-warning">{pendingProductionSheets.length}</p>
          </div>
          <div>
            <p className="text-sm text-base-content/70">Completed</p>
            <p className="text-2xl font-bold text-success">{completedProductionSheets.length}</p>
          </div>
          <div>
            <p className="text-sm text-base-content/70">Total</p>
            <p className="text-2xl font-bold text-primary">{productionSheets.length}</p>
          </div>
        </div>

        {/* Pending Production Sheets */}
        {pendingProductionSheets.length > 0 && (
          <section className="space-y-4">
            <h2 className="text-xl font-semibold">Pending Production Sheets</h2>

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
          </section>
        )}

        {/* Completed Production Sheets */}
        {completedProductionSheets.length > 0 && (
          <section className="space-y-4">
            <h2 className="text-xl font-semibold">Completed Production Sheets</h2>

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
          </section>
        )}

        {/* Empty State */}
        {productionSheets.length === 0 && (
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
        )}
      </div>
  );
}
