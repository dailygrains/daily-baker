import { getCurrentUser } from '@/lib/clerk';
import { redirect } from 'next/navigation';
import { SetPageHeader } from '@/components/layout/SetPageHeader';
import { getSuppliesByBakery } from '@/app/actions/supply';
import Link from 'next/link';
import { Plus, Package } from 'lucide-react';

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

export default async function SuppliesPage() {
  const user = await getCurrentUser();

  if (!user) {
    redirect('/sign-in');
  }

  if (!user.bakeryId) {
    redirect('/dashboard');
  }

  const suppliesResult = await getSuppliesByBakery(user.bakeryId);

  if (!suppliesResult.success) {
    return (
      <div className="alert alert-error">
        <span>{suppliesResult.error}</span>
      </div>
    );
  }

  const supplies = suppliesResult.data || [];
  const totalSupplies = supplies.length;
  const lowStock = supplies.filter(
    (s) =>
      s.lowStockThreshold !== null &&
      Number(s.quantityOnHand) < Number(s.lowStockThreshold)
  ).length;
  const totalValue = supplies
    .reduce((sum, s) => sum + Number(s.costPerUnit) * Number(s.quantityOnHand), 0)
    .toFixed(2);

  // Count by category
  const categoryCount = supplies.reduce(
    (acc, s) => {
      acc[s.category] = (acc[s.category] || 0) + 1;
      return acc;
    },
    {} as Record<string, number>
  );

  return (
    <div className="space-y-6">
      <SetPageHeader
        title="Supplies"
        description="Track packaging, disposables, labels, and other supplies"
        actions={
          <Link href="/dashboard/supplies/new" className="btn btn-primary">
            <Plus className="h-4 w-4" />
            Add Supply
          </Link>
        }
      />

      {/* Stats */}
      <div className="card bg-base-100 p-4">
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <div>
            <p className="text-sm text-base-content/70">Total Supplies</p>
            <p className="text-2xl font-bold text-primary">{totalSupplies}</p>
          </div>
          <div>
            <p className="text-sm text-base-content/70">Low Stock</p>
            <p className="text-2xl font-bold text-warning">{lowStock}</p>
          </div>
          <div>
            <p className="text-sm text-base-content/70">Total Value</p>
            <p className="text-2xl font-bold text-success">${totalValue}</p>
          </div>
          <div>
            <p className="text-sm text-base-content/70">Categories</p>
            <p className="text-2xl font-bold">
              {Object.keys(categoryCount).length}
            </p>
          </div>
        </div>
      </div>

      {/* Supplies List */}
      {supplies.length === 0 ? (
        <div className="text-center py-12">
          <h3 className="text-2xl font-bold mb-2">No supplies yet</h3>
          <p className="text-base-content/70 mb-6">
            Start tracking your bakery supplies
          </p>
          <Link href="/dashboard/supplies/new" className="btn btn-primary">
            <Plus className="h-4 w-4" />
            Add Your First Supply
          </Link>
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="table table-zebra table-lg">
            <thead>
              <tr>
                <th>Name</th>
                <th>Category</th>
                <th>Unit</th>
                <th>Qty On Hand</th>
                <th>Cost/Unit</th>
                <th>Vendors</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {supplies.map((supply) => {
                const qtyOnHand = Number(supply.quantityOnHand);
                const threshold = supply.lowStockThreshold
                  ? Number(supply.lowStockThreshold)
                  : null;
                const isLowStock =
                  threshold !== null && qtyOnHand < threshold;

                return (
                  <tr key={supply.id}>
                    <td>
                      <Link
                        href={`/dashboard/supplies/${supply.id}`}
                        className="font-semibold hover:text-primary"
                      >
                        {supply.name}
                      </Link>
                      {supply.sku && (
                        <p className="text-sm text-base-content/50">
                          SKU: {supply.sku}
                        </p>
                      )}
                    </td>
                    <td>
                      <span
                        className={`badge ${getCategoryBadgeClass(supply.category)}`}
                      >
                        {supply.category}
                      </span>
                    </td>
                    <td>{supply.unit}</td>
                    <td>
                      <span
                        className={`badge badge-outline gap-1 ${isLowStock ? 'badge-warning' : ''}`}
                      >
                        <Package className="h-3 w-3" />
                        {qtyOnHand}
                      </span>
                    </td>
                    <td>
                      <span className="font-semibold">
                        ${Number(supply.costPerUnit).toFixed(2)}
                      </span>
                    </td>
                    <td>
                      {supply.vendors.length > 0 ? (
                        <span className="text-sm">
                          {supply.vendors
                            .map((sv) => sv.vendor.name)
                            .join(', ')}
                        </span>
                      ) : (
                        <span className="text-base-content/50">None</span>
                      )}
                    </td>
                    <td>
                      <Link
                        href={`/dashboard/supplies/${supply.id}/edit`}
                        className="btn btn-ghost btn-xs"
                      >
                        Edit
                      </Link>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
