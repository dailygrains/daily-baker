import { getCurrentUser } from '@/lib/clerk';
import { redirect } from 'next/navigation';
import { getInventoryLotById } from '@/app/actions/inventory';
import { SetPageHeader } from '@/components/layout/SetPageHeader';
import Link from 'next/link';
import { AlertTriangle } from 'lucide-react';
import { formatDistanceToNow, format } from 'date-fns';
import { formatQuantity, formatCurrency } from '@/lib/format';

export default async function LotDetailPage({
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

  const lotResult = await getInventoryLotById(id);

  if (!lotResult.success || !lotResult.data) {
    redirect('/dashboard/ingredients');
  }

  const lot = lotResult.data;

  const isDepleted = lot.remainingQty <= 0;
  const isExpired = lot.expiresAt && new Date(lot.expiresAt) < new Date();
  const isExpiringSoon = lot.expiresAt &&
    !isExpired &&
    new Date(lot.expiresAt).getTime() - Date.now() < 7 * 24 * 60 * 60 * 1000;

  const totalValue = lot.remainingQty * lot.costPerUnit;
  const percentRemaining = ((lot.remainingQty / lot.purchaseQty) * 100).toFixed(0);

  return (
    <>
      <SetPageHeader
        title={`Lot - ${lot.ingredient.name}`}
        sticky
        breadcrumbs={[
          { label: 'Ingredients', href: '/dashboard/ingredients' },
          { label: lot.ingredient.name, href: `/dashboard/ingredients/${lot.ingredient.id}` },
          { label: 'Lot' },
        ]}
        actions={
          <Link
            href={`/dashboard/inventory/lots/${id}/edit`}
            className="btn btn-primary"
          >
            Edit
          </Link>
        }
      />

      <div className="space-y-8">
        {/* Status Banner */}
        <div className="flex items-center gap-2">
          {isDepleted ? (
            <span className="badge badge-ghost badge-lg">Depleted</span>
          ) : isExpired ? (
            <span className="badge badge-error badge-lg">Expired</span>
          ) : isExpiringSoon ? (
            <span className="badge badge-warning badge-lg">Expiring Soon</span>
          ) : (
            <span className="badge badge-success badge-lg">Active</span>
          )}
        </div>

        {/* Overview Stats */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
          <div>
            <p className="text-sm text-base-content/70">Ingredient</p>
            <Link
              href={`/dashboard/ingredients/${lot.ingredient.id}`}
              className="text-xl font-bold link link-hover"
            >
              {lot.ingredient.name}
            </Link>
          </div>

          <div>
            <p className="text-sm text-base-content/70">Original Qty</p>
            <p className="text-2xl font-bold">
              {formatQuantity(lot.purchaseQty)} {lot.purchaseUnit}
            </p>
          </div>

          <div>
            <p className="text-sm text-base-content/70">Remaining</p>
            <p className={`text-2xl font-bold ${isDepleted ? 'text-base-content/50' : ''}`}>
              {formatQuantity(lot.remainingQty)} {lot.purchaseUnit}
            </p>
            {!isDepleted && (
              <p className="text-sm text-base-content/60">{percentRemaining}% left</p>
            )}
          </div>

          <div>
            <p className="text-sm text-base-content/70">Cost/Unit</p>
            <p className="text-2xl font-bold">
              {formatCurrency(lot.costPerUnit)}/{lot.purchaseUnit}
            </p>
          </div>

          <div>
            <p className="text-sm text-base-content/70">Remaining Value</p>
            <p className="text-2xl font-bold text-success">
              {formatCurrency(totalValue)}
            </p>
          </div>

          <div>
            <p className="text-sm text-base-content/70">Purchase Date</p>
            <p className="text-xl font-bold">
              {format(new Date(lot.purchasedAt), 'MMM d, yyyy')}
            </p>
            <p className="text-sm text-base-content/60">
              {formatDistanceToNow(new Date(lot.purchasedAt), { addSuffix: true })}
            </p>
          </div>
        </div>

        {/* Details */}
        <section className="space-y-4">
          <h2 className="text-xl font-semibold">Details</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            <div>
              <p className="text-sm text-base-content/70">Vendor</p>
              {lot.vendor ? (
                <Link
                  href={`/dashboard/vendors/${lot.vendor.id}`}
                  className="text-lg font-semibold link link-hover"
                >
                  {lot.vendor.name}
                </Link>
              ) : (
                <p className="text-base-content/50 italic">No vendor</p>
              )}
            </div>

            <div>
              <p className="text-sm text-base-content/70">Expiration Date</p>
              {lot.expiresAt ? (
                <div className={`flex items-center gap-2 ${isExpired ? 'text-error' : isExpiringSoon ? 'text-warning' : ''}`}>
                  {(isExpired || isExpiringSoon) && <AlertTriangle className="h-5 w-5" />}
                  <div>
                    <p className="text-lg font-semibold">
                      {format(new Date(lot.expiresAt), 'MMM d, yyyy')}
                    </p>
                    <p className="text-sm">
                      {formatDistanceToNow(new Date(lot.expiresAt), { addSuffix: true })}
                    </p>
                  </div>
                </div>
              ) : (
                <p className="text-base-content/50 italic">No expiration</p>
              )}
            </div>
          </div>

          {lot.notes && (
            <div>
              <p className="text-sm text-base-content/70">Notes</p>
              <p className="mt-1">{lot.notes}</p>
            </div>
          )}
        </section>
      </div>
    </>
  );
}
