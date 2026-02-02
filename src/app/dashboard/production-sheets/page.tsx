import { getCurrentUser } from '@/lib/clerk';
import { redirect } from 'next/navigation';
import { SetPageHeader } from '@/components/layout/SetPageHeader';
import { getProductionSheetsByBakery } from '@/app/actions/productionSheet';
import Link from 'next/link';
import { Plus, Briefcase, Calendar, Clock } from 'lucide-react';
import { formatDistanceToNow, format } from 'date-fns';

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

  // Helper to get recipe names
  const getRecipeNames = (
    recipes: Array<{ recipe: { name: string } }>
  ): string => {
    if (recipes.length === 0) return 'No recipes';
    if (recipes.length === 1) return recipes[0].recipe.name;
    return `${recipes[0].recipe.name} +${recipes.length - 1} more`;
  };

  // Helper to calculate total cost
  const getTotalCost = (
    recipes: Array<{ scale: unknown; recipe: { totalCost: unknown } }>
  ): number => {
    return recipes.reduce((sum, r) => {
      return sum + Number(r.recipe.totalCost || 0) * Number(r.scale);
    }, 0);
  };

  return (
    <div className="space-y-6">
      <SetPageHeader
        title="Production Sheets"
        description="Manage production runs and track ingredient usage"
        actions={
          <Link
            href="/dashboard/production-sheets/new"
            className="btn btn-primary"
          >
            <Plus className="h-5 w-5 mr-2" />
            New Production Sheet
          </Link>
        }
      />

      {/* Stats */}
      <div className="card bg-base-100 p-4">
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
      </div>

      {/* Pending Production Sheets */}
      {pendingProductionSheets.length > 0 && (
        <section className="space-y-4">
          <h2 className="text-xl font-semibold">Pending Production Sheets</h2>

          <div className="overflow-x-auto">
            <table className="table table-zebra table-lg">
              <thead>
                <tr>
                  <th>Description / Recipes</th>
                  <th>Recipes</th>
                  <th>Scheduled</th>
                  <th>Est. Cost</th>
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
                        {productionSheet.description || getRecipeNames(productionSheet.recipes)}
                      </Link>
                      {productionSheet.description && (
                        <p className="text-sm text-base-content/60">
                          {getRecipeNames(productionSheet.recipes)}
                        </p>
                      )}
                    </td>
                    <td>
                      <span className="badge badge-outline">
                        {productionSheet.recipes.length}
                      </span>
                    </td>
                    <td>
                      {productionSheet.scheduledFor ? (
                        <div className="flex items-center gap-1 text-sm">
                          <Calendar className="h-4 w-4 text-base-content/60" />
                          {format(new Date(productionSheet.scheduledFor), 'MMM d, h:mm a')}
                        </div>
                      ) : (
                        <span className="text-base-content/40">-</span>
                      )}
                    </td>
                    <td className="font-mono">
                      ${getTotalCost(productionSheet.recipes).toFixed(2)}
                    </td>
                    <td className="text-sm text-base-content/70">
                      {formatDistanceToNow(new Date(productionSheet.createdAt), {
                        addSuffix: true,
                      })}
                    </td>
                    <td>
                      <div className="flex gap-1">
                        <Link
                          href={`/dashboard/production-sheets/${productionSheet.id}`}
                          className="btn btn-sm btn-ghost"
                        >
                          View
                        </Link>
                        <Link
                          href={`/dashboard/production-sheets/${productionSheet.id}/edit`}
                          className="btn btn-sm btn-ghost"
                        >
                          Edit
                        </Link>
                      </div>
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
            <table className="table table-zebra table-lg">
              <thead>
                <tr>
                  <th>Description / Recipes</th>
                  <th>Recipes</th>
                  <th>Total Cost</th>
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
                        {productionSheet.description || getRecipeNames(productionSheet.recipes)}
                      </Link>
                      {productionSheet.description && (
                        <p className="text-sm text-base-content/60">
                          {getRecipeNames(productionSheet.recipes)}
                        </p>
                      )}
                    </td>
                    <td>
                      <span className="badge badge-outline">
                        {productionSheet.recipes.length}
                      </span>
                    </td>
                    <td className="font-mono">
                      ${getTotalCost(productionSheet.recipes).toFixed(2)}
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
