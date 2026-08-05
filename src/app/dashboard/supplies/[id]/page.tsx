import { getCurrentUser } from '@/lib/clerk';
import { redirect } from 'next/navigation';
import { SetPageHeader } from '@/components/layout/SetPageHeader';
import { getSupplyById } from '@/app/actions/supply';
import Link from 'next/link';
import { Mail, Phone, Hash } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';

const getCategoryBadgeClass = (category: string) => {
  switch (category) {
    case 'PACKAGING':
      return 'badge-primary';
    case 'DISPOSABLE':
      return 'badge-info';
    case 'LABEL':
      return 'badge-warning';
    case 'CLEANING':
      return 'badge-success';
    case 'OTHER':
      return 'badge-neutral';
    default:
      return 'badge-ghost';
  }
};

export default async function SupplyDetailPage({
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

  const supplyResult = await getSupplyById(id);

  if (!supplyResult.success || !supplyResult.data) {
    redirect('/dashboard/supplies');
  }

  const supply = supplyResult.data;
  const costPerUnit = Number(supply.costPerUnit);
  const quantityOnHand = Number(supply.quantityOnHand);
  const totalValue = costPerUnit * quantityOnHand;
  const lowStockThreshold = supply.lowStockThreshold
    ? Number(supply.lowStockThreshold)
    : null;
  const isLowStock =
    lowStockThreshold !== null && quantityOnHand < lowStockThreshold;

  return (
    <>
      <SetPageHeader
        title={supply.name}
        breadcrumbs={[
          { label: 'Supplies', href: '/dashboard/supplies' },
          { label: supply.name },
        ]}
        actions={
          <Link
            href={`/dashboard/supplies/${id}/edit`}
            className="btn btn-primary"
          >
            Edit
          </Link>
        }
      />

      <div className="space-y-8">
        {/* Overview Stats */}
        <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-6 gap-4">
          <div>
            <p className="text-sm text-base-content/70">Category</p>
            <span
              className={`badge ${getCategoryBadgeClass(supply.category)} badge-lg mt-1`}
            >
              {supply.category}
            </span>
          </div>

          <div>
            <p className="text-sm text-base-content/70">Qty On Hand</p>
            <p
              className={`text-2xl font-bold ${isLowStock ? 'text-warning' : ''}`}
            >
              {quantityOnHand}
            </p>
          </div>

          <div>
            <p className="text-sm text-base-content/70">Cost/Unit</p>
            <p className="text-2xl font-bold">${costPerUnit.toFixed(2)}</p>
          </div>

          <div>
            <p className="text-sm text-base-content/70">Total Value</p>
            <p className="text-2xl font-bold text-success">
              ${totalValue.toFixed(2)}
            </p>
          </div>

          <div>
            <p className="text-sm text-base-content/70">Unit</p>
            <p className="text-lg font-semibold">{supply.unit}</p>
          </div>

          <div>
            <p className="text-sm text-base-content/70">Last Updated</p>
            <p className="text-sm">
              {formatDistanceToNow(new Date(supply.updatedAt), {
                addSuffix: true,
              })}
            </p>
          </div>
        </div>

        {/* Details */}
        <section className="space-y-4">
          <h2 className="text-xl font-semibold">Details</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {supply.sku && (
              <div>
                <p className="text-sm text-base-content/70">SKU</p>
                <div className="flex items-center gap-2 mt-1">
                  <Hash className="h-4 w-4 text-base-content/70" />
                  <p className="font-mono">{supply.sku}</p>
                </div>
              </div>
            )}

            {supply.unitsPerCase && (
              <div>
                <p className="text-sm text-base-content/70">Units Per Case</p>
                <p className="text-lg font-semibold">{supply.unitsPerCase}</p>
              </div>
            )}

            {lowStockThreshold !== null && (
              <div>
                <p className="text-sm text-base-content/70">
                  Low Stock Threshold
                </p>
                <p
                  className={`text-lg font-semibold ${isLowStock ? 'text-warning' : ''}`}
                >
                  {lowStockThreshold}
                </p>
              </div>
            )}
          </div>

          {supply.description && (
            <div>
              <p className="text-sm text-base-content/70">Description</p>
              <p className="whitespace-pre-line text-base-content/80 mt-1">
                {supply.description}
              </p>
            </div>
          )}
        </section>

        {/* Vendors */}
        {supply.vendors.length > 0 && (
          <section className="space-y-4">
            <h2 className="text-xl font-semibold">Vendors</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {supply.vendors.map((sv) => (
                <div key={sv.vendor.id} className="card bg-base-200 p-4">
                  <Link
                    href={`/dashboard/vendors/${sv.vendor.id}`}
                    className="text-lg font-semibold hover:text-primary"
                  >
                    {sv.vendor.name}
                  </Link>
                  {(sv.vendor.email || sv.vendor.phone) && (
                    <div className="mt-2 space-y-1">
                      {sv.vendor.email && (
                        <a
                          href={`mailto:${sv.vendor.email}`}
                          className="flex items-center gap-2 text-sm hover:text-primary"
                        >
                          <Mail className="h-4 w-4" />
                          {sv.vendor.email}
                        </a>
                      )}
                      {sv.vendor.phone && (
                        <a
                          href={`tel:${sv.vendor.phone}`}
                          className="flex items-center gap-2 text-sm hover:text-primary"
                        >
                          <Phone className="h-4 w-4" />
                          {sv.vendor.phone}
                        </a>
                      )}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </section>
        )}

        {/* Products Using This Supply */}
        {supply.productSupplies.length > 0 && (
          <section className="space-y-4">
            <h2 className="text-xl font-semibold">Used in Products</h2>
            <ul className="list-disc list-inside space-y-1">
              {supply.productSupplies.map((ps) => (
                <li key={ps.id}>
                  <Link
                    href={`/dashboard/products/${ps.variation.product.id}`}
                    className="link link-hover"
                  >
                    {ps.variation.product.name}
                  </Link>
                  <span className="text-base-content/60"> &mdash; {ps.variation.name}</span>
                </li>
              ))}
            </ul>
          </section>
        )}
      </div>
    </>
  );
}
