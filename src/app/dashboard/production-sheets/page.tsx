import { getCurrentUser } from '@/lib/clerk';
import { redirect } from 'next/navigation';
import { SetPageHeader } from '@/components/layout/SetPageHeader';
import { getProductionSheetsByBakery } from '@/app/actions/productionSheet';
import { ProductionSheetsTable } from '@/components/productionSheets/ProductionSheetsTable';
import Link from 'next/link';
import { Plus, Briefcase } from 'lucide-react';

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

  // Serialize data for client component (convert Decimals to numbers)
  const serializedSheets = productionSheets.map((ps) => ({
    ...ps,
    recipes: ps.recipes.map((r) => ({
      ...r,
      scale: Number(r.scale),
      recipe: {
        ...r.recipe,
        totalCost: r.recipe.totalCost ? Number(r.recipe.totalCost) : null,
      },
    })),
  }));

  // Separate pending and completed
  const pendingProductionSheets = serializedSheets.filter((ps) => !ps.completed);
  const completedProductionSheets = serializedSheets.filter((ps) => ps.completed);


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

      {/* Pending Production Sheets */}
      {pendingProductionSheets.length > 0 && (
        <section className="space-y-4">
          <h2 className="text-xl font-semibold">Pending Production Sheets</h2>
          <ProductionSheetsTable productionSheets={pendingProductionSheets} variant="pending" />
        </section>
      )}

      {/* Completed Production Sheets */}
      {completedProductionSheets.length > 0 && (
        <section className="space-y-4">
          <h2 className="text-xl font-semibold">Completed Production Sheets</h2>
          <ProductionSheetsTable productionSheets={completedProductionSheets} variant="completed" />
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
