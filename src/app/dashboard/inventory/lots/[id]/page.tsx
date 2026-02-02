import { getCurrentUser } from '@/lib/clerk';
import { redirect } from 'next/navigation';
import { getInventoryLotById } from '@/app/actions/inventory';
import { PageHeader } from '@/components/ui/PageHeader';
import Link from 'next/link';
import { Edit, ArrowLeft, Package, DollarSign, Calendar, AlertTriangle } from 'lucide-react';
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

  return (
    <>
      <PageHeader
        title={`Lot - ${lot.ingredient.name}`}
        sticky
        breadcrumbs={[
          { label: 'Ingredients', href: '/dashboard/ingredients' },
          { label: lot.ingredient.name, href: `/dashboard/ingredients/${lot.ingredient.id}` },
          { label: 'Lot' },
        ]}
        actions={
          <>
            <Link
              href={`/dashboard/ingredients/${lot.ingredient.id}`}
              className="btn btn-ghost"
            >
              <ArrowLeft className="h-5 w-5 mr-2" />
              Back
            </Link>
            <Link
              href={`/dashboard/inventory/lots/${id}/edit`}
              className="btn btn-primary"
            >
              <Edit className="h-5 w-5 mr-2" />
              Edit
            </Link>
          </>
        }
      />

      <div className="space-y-6">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main Info Card */}
          <div className="lg:col-span-2 card bg-base-100 shadow-xl">
            <div className="card-body">
              <div className="flex items-center justify-between">
                <h2 className="card-title">Lot Details</h2>
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

              <div className="grid grid-cols-2 gap-4 mt-4">
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
                  <p className="text-sm text-base-content/70">Purchase Date</p>
                  <p className="text-xl font-bold">
                    {format(new Date(lot.purchasedAt), 'MMM d, yyyy')}
                  </p>
                  <p className="text-sm text-base-content/60">
                    {formatDistanceToNow(new Date(lot.purchasedAt), { addSuffix: true })}
                  </p>
                </div>

                <div>
                  <p className="text-sm text-base-content/70">Original Quantity</p>
                  <p className="text-xl font-bold">
                    {formatQuantity(lot.purchaseQty)} {lot.purchaseUnit}
                  </p>
                </div>

                <div>
                  <p className="text-sm text-base-content/70">Remaining Quantity</p>
                  <p className={`text-xl font-bold ${isDepleted ? 'text-base-content/50' : ''}`}>
                    {formatQuantity(lot.remainingQty)} {lot.purchaseUnit}
                  </p>
                  {!isDepleted && (
                    <p className="text-sm text-base-content/60">
                      {((lot.remainingQty / lot.purchaseQty) * 100).toFixed(0)}% remaining
                    </p>
                  )}
                </div>

                <div>
                  <p className="text-sm text-base-content/70">Cost per Unit</p>
                  <p className="text-xl font-bold">
                    {formatCurrency(lot.costPerUnit)}/{lot.purchaseUnit}
                  </p>
                </div>

                <div>
                  <p className="text-sm text-base-content/70">Remaining Value</p>
                  <p className="text-xl font-bold text-success">
                    {formatCurrency(totalValue)}
                  </p>
                </div>

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
                <div className="mt-4">
                  <p className="text-sm text-base-content/70">Notes</p>
                  <p className="mt-1">{lot.notes}</p>
                </div>
              )}
            </div>
          </div>

          {/* Stats Card */}
          <div className="space-y-4">
            <div className="stats stats-vertical shadow">
              <div className="stat">
                <div className="stat-figure text-primary">
                  <Package className="h-8 w-8" />
                </div>
                <div className="stat-title">Remaining</div>
                <div className="stat-value text-primary">
                  {formatQuantity(lot.remainingQty)}
                </div>
                <div className="stat-desc">{lot.purchaseUnit}</div>
              </div>

              <div className="stat">
                <div className="stat-figure text-secondary">
                  <DollarSign className="h-8 w-8" />
                </div>
                <div className="stat-title">Value</div>
                <div className="stat-value text-secondary">
                  {formatCurrency(totalValue)}
                </div>
                <div className="stat-desc">at {formatCurrency(lot.costPerUnit)}/{lot.purchaseUnit}</div>
              </div>

              {lot.expiresAt && (
                <div className="stat">
                  <div className={`stat-figure ${isExpired ? 'text-error' : isExpiringSoon ? 'text-warning' : 'text-accent'}`}>
                    <Calendar className="h-8 w-8" />
                  </div>
                  <div className="stat-title">Expires</div>
                  <div className={`stat-value text-sm ${isExpired ? 'text-error' : isExpiringSoon ? 'text-warning' : 'text-accent'}`}>
                    {format(new Date(lot.expiresAt), 'MMM d')}
                  </div>
                  <div className="stat-desc">
                    {formatDistanceToNow(new Date(lot.expiresAt), { addSuffix: true })}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
