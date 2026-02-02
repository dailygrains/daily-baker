import { getCurrentUser } from '@/lib/clerk';
import { redirect } from 'next/navigation';
import { SetPageHeader } from '@/components/layout/SetPageHeader';
import { getIngredientById } from '@/app/actions/ingredient';
import Link from 'next/link';
import { Edit, Boxes, AlertTriangle, TrendingDown, Plus, AlertCircle } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';

export default async function IngredientDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const user = await getCurrentUser();
  const { id } = await params;

  if (!user) {
    redirect('/sign-in');
  }

  if (!user.bakeryId) {
    redirect('/dashboard');
  }

  const ingredientResult = await getIngredientById(id);

  if (!ingredientResult.success || !ingredientResult.data) {
    redirect('/dashboard/ingredients');
  }

  const ingredient = ingredientResult.data;
  const currentQty = ingredient.currentQty;
  const costPerUnit = ingredient.costPerUnit;
  const totalValue = currentQty * costPerUnit;
  const isLowStock = currentQty < 100;

  // Get lot count and active lots
  const lots = ingredient.inventory?.lots || [];
  const activeLots = lots.filter((lot) => lot.remainingQty > 0);

  // Collect all recent usages across lots
  const allUsages = lots
    .flatMap((lot) =>
      lot.usages.map((usage) => ({
        ...usage,
        shortfall: Number(usage.shortfall) || 0,
        quantity: Number(usage.quantity),
        lot: {
          id: lot.id,
          purchaseUnit: lot.purchaseUnit,
          vendor: lot.vendor,
        },
      }))
    )
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
    .slice(0, 10);

  // Get usage reason badge class
  const getUsageReasonBadgeClass = (reason: string) => {
    switch (reason) {
      case 'USE':
        return 'badge-info';
      case 'ADJUST':
        return 'badge-warning';
      case 'WASTE':
        return 'badge-error';
      default:
        return 'badge-ghost';
    }
  };

  return (
    <>
      <SetPageHeader
        title={ingredient.name}
        sticky
        breadcrumbs={[
          { label: 'Ingredients', href: '/dashboard/ingredients' },
          { label: ingredient.name },
        ]}
        actions={
          <Link
            href={`/dashboard/ingredients/${id}/edit`}
            className="btn btn-primary"
          >
            <Edit className="h-5 w-5 mr-2" />
            Edit
          </Link>
        }
      />

      <div className="space-y-8">

        {/* Overview Stats */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
          <div>
            <p className="text-sm text-base-content/70">Current Quantity</p>
            <p className={`text-2xl font-bold ${isLowStock ? 'text-warning' : ''}`}>
              {currentQty.toFixed(3)} {ingredient.unit}
            </p>
            {isLowStock && <p className="text-sm text-warning">Low stock</p>}
          </div>

          <div>
            <p className="text-sm text-base-content/70">Avg Cost</p>
            <p className="text-2xl font-bold">${costPerUnit.toFixed(2)}</p>
            <p className="text-sm text-base-content/70">per {ingredient.unit}</p>
          </div>

          <div>
            <p className="text-sm text-base-content/70">Total Value</p>
            <p className="text-2xl font-bold text-success">${totalValue.toFixed(2)}</p>
          </div>

          <div>
            <p className="text-sm text-base-content/70">Active Lots</p>
            <p className="text-2xl font-bold">{activeLots.length}</p>
            <p className="text-sm text-base-content/70">{lots.length - activeLots.length} depleted</p>
          </div>

          <div>
            <p className="text-sm text-base-content/70">Used in Recipes</p>
            <p className="text-2xl font-bold">{ingredient._count.recipeUses}</p>
          </div>

          <div>
            <p className="text-sm text-base-content/70">Vendors</p>
            {ingredient.vendors.length > 0 ? (
              <div className="flex flex-wrap gap-1 mt-1">
                {ingredient.vendors.map((iv) => (
                  <Link
                    key={iv.vendor.id}
                    href={`/dashboard/vendors/${iv.vendor.id}`}
                    className="badge badge-ghost hover:badge-primary"
                  >
                    {iv.vendor.name}
                  </Link>
                ))}
              </div>
            ) : (
              <p className="text-base-content/50 italic">None</p>
            )}
          </div>
        </div>

        {/* Inventory Lots */}
        <section className="space-y-4">
          <div className="flex justify-between items-center">
            <h2 className="text-xl font-semibold">Inventory Lots (FIFO)</h2>
            <Link
              href={`/dashboard/inventory/lots/new?ingredientId=${id}`}
              className="btn btn-primary btn-sm"
            >
              <Plus className="h-4 w-4" />
              Add Lot
            </Link>
          </div>

          {lots.length === 0 ? (
            <div className="text-center py-8">
              <Boxes className="h-12 w-12 mx-auto text-base-content/30 mb-2" />
              <p className="text-base-content/70">No inventory lots</p>
              <p className="text-sm text-base-content/50 mb-4">
                Add purchase lots to track inventory
              </p>
              <Link
                href={`/dashboard/inventory/lots/new?ingredientId=${id}`}
                className="btn btn-primary btn-sm"
              >
                Add First Lot
              </Link>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="table table-zebra">
                <thead>
                  <tr>
                    <th>Purchase Date</th>
                    <th>Vendor</th>
                    <th>Original Qty</th>
                    <th>Remaining</th>
                    <th>Cost/Unit</th>
                    <th>Expires</th>
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {lots.map((lot) => {
                    const isDepleted = lot.remainingQty <= 0;
                    const isExpiringSoon = lot.expiresAt &&
                      new Date(lot.expiresAt).getTime() - Date.now() < 7 * 24 * 60 * 60 * 1000;
                    const isExpired = lot.expiresAt && new Date(lot.expiresAt) < new Date();

                    return (
                      <tr key={lot.id} className={`hover cursor-pointer ${isDepleted ? 'opacity-50' : ''}`}>
                        <td>
                          <Link href={`/dashboard/inventory/lots/${lot.id}`} className="block">
                            {formatDistanceToNow(new Date(lot.purchasedAt), {
                              addSuffix: true,
                            })}
                          </Link>
                        </td>
                        <td>
                          <Link href={`/dashboard/inventory/lots/${lot.id}`} className="block">
                            {lot.vendor ? lot.vendor.name : <span className="text-base-content/50">-</span>}
                          </Link>
                        </td>
                        <td>
                          <Link href={`/dashboard/inventory/lots/${lot.id}`} className="block">
                            {lot.purchaseQty.toFixed(2)} {lot.purchaseUnit}
                          </Link>
                        </td>
                        <td>
                          <Link href={`/dashboard/inventory/lots/${lot.id}`} className="block">
                            <span className={lot.remainingQty <= 0 ? 'text-base-content/50' : 'font-semibold'}>
                              {lot.remainingQty.toFixed(2)} {lot.purchaseUnit}
                            </span>
                          </Link>
                        </td>
                        <td>
                          <Link href={`/dashboard/inventory/lots/${lot.id}`} className="block">
                            ${lot.costPerUnit.toFixed(2)}/{lot.purchaseUnit}
                          </Link>
                        </td>
                        <td>
                          <Link href={`/dashboard/inventory/lots/${lot.id}`} className="block">
                            {lot.expiresAt ? (
                              <span className={`flex items-center gap-1 ${isExpired ? 'text-error' : isExpiringSoon ? 'text-warning' : ''}`}>
                                {(isExpired || isExpiringSoon) && <AlertTriangle className="h-3 w-3" />}
                                {formatDistanceToNow(new Date(lot.expiresAt), { addSuffix: true })}
                              </span>
                            ) : (
                              <span className="text-base-content/50">-</span>
                            )}
                          </Link>
                        </td>
                        <td>
                          <Link href={`/dashboard/inventory/lots/${lot.id}`} className="block">
                            {isDepleted ? (
                              <span className="badge badge-ghost">Depleted</span>
                            ) : isExpired ? (
                              <span className="badge badge-error">Expired</span>
                            ) : isExpiringSoon ? (
                              <span className="badge badge-warning">Expiring Soon</span>
                            ) : (
                              <span className="badge badge-success">Active</span>
                            )}
                          </Link>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </section>

        {/* Recent Activity */}
        {allUsages.length > 0 && (
          <section className="space-y-4">
            <h2 className="text-xl font-semibold">Recent Activity</h2>
            <div className="overflow-x-auto">
              <table className="table table-zebra">
                <thead>
                  <tr>
                    <th>Date</th>
                    <th>Type</th>
                    <th>Quantity</th>
                    <th>Shortfall</th>
                    <th>From Lot</th>
                    <th>By</th>
                    <th>Related To</th>
                  </tr>
                </thead>
                <tbody>
                  {allUsages.map((usage) => {
                    const hasShortfall = (usage.shortfall ?? 0) > 0;
                    return (
                      <tr key={usage.id} className={hasShortfall ? 'bg-warning/10' : ''}>
                        <td className="align-top">
                          {formatDistanceToNow(new Date(usage.createdAt), {
                            addSuffix: true,
                          })}
                        </td>
                        <td className="align-top">
                          <span className={`badge ${getUsageReasonBadgeClass(usage.reason)} gap-1`}>
                            <TrendingDown className="h-3 w-3" />
                            {usage.reason}
                          </span>
                        </td>
                        <td className="align-top">
                          {usage.quantity.toFixed(3)} {usage.lot.purchaseUnit}
                        </td>
                        <td className="align-top">
                          {hasShortfall ? (
                            <span className="badge badge-warning gap-1">
                              <AlertCircle className="h-3 w-3" />
                              {(usage.shortfall ?? 0).toFixed(3)}
                            </span>
                          ) : (
                            <span className="text-base-content/50">-</span>
                          )}
                        </td>
                        <td className="align-top text-sm text-base-content/70">
                          {usage.lot.vendor?.name || 'Unknown vendor'}
                        </td>
                        <td className="align-top text-sm">
                          {usage.creator?.name || 'Unknown'}
                        </td>
                        <td className="align-top">
                          {usage.productionSheet ? (
                            <Link
                              href={`/dashboard/production-sheets/${usage.productionSheet.id}`}
                              className="link link-primary text-sm"
                            >
                              {usage.productionSheet.recipe?.name || 'Production sheet'}
                            </Link>
                          ) : (
                            <span className="text-sm text-base-content/50">
                              {usage.notes || '-'}
                            </span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </section>
        )}
      </div>
    </>
  );
}
