import { getCurrentUser } from '@/lib/clerk';
import { redirect } from 'next/navigation';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { PageHeader } from '@/components/ui/PageHeader';
import { getEquipmentByBakery } from '@/app/actions/equipment';
import Link from 'next/link';
import { Plus, Wrench, DollarSign, Package } from 'lucide-react';

export default async function EquipmentPage() {
  const user = await getCurrentUser();

  if (!user) {
    redirect('/sign-in');
  }

  if (!user.bakeryId) {
    redirect('/dashboard');
  }

  const equipmentResult = await getEquipmentByBakery(user.bakeryId);

  if (!equipmentResult.success) {
    return (
      <DashboardLayout isPlatformAdmin={user.isPlatformAdmin}>
        <div className="alert alert-error">
          <span>{equipmentResult.error}</span>
        </div>
      </DashboardLayout>
    );
  }

  const equipment = equipmentResult.data || [];
  const totalEquipment = equipment.length;
  const totalCost = equipment.reduce((sum, e) => sum + (Number(e.cost) || 0), 0).toFixed(2);
  const inUse = equipment.filter((e) => e.status === 'IN_USE').length;
  const maintenance = equipment.filter((e) => e.status === 'MAINTENANCE').length;

  // Status badge colors
  const getStatusBadgeClass = (status: string) => {
    switch (status) {
      case 'CONSIDERING':
        return 'badge-neutral';
      case 'ORDERED':
        return 'badge-info';
      case 'RECEIVED':
        return 'badge-success';
      case 'IN_USE':
        return 'badge-primary';
      case 'MAINTENANCE':
        return 'badge-warning';
      case 'RETIRED':
        return 'badge-error';
      default:
        return 'badge-ghost';
    }
  };

  return (
    <DashboardLayout isPlatformAdmin={user.isPlatformAdmin}>
      <div className="space-y-6">
        <PageHeader
          title="Equipment"
          description="Track and manage bakery equipment"
          action={
            <Link href="/dashboard/equipment/new" className="btn btn-primary">
              <Plus className="h-4 w-4" />
              Add Equipment
            </Link>
          }
        />

        {/* Stats */}
        <div className="stats stats-horizontal shadow w-full">
          <div className="stat">
            <div className="stat-title">Total Equipment</div>
            <div className="stat-value text-primary">{totalEquipment}</div>
            <div className="stat-desc">Items tracked</div>
          </div>

          <div className="stat">
            <div className="stat-title">In Use</div>
            <div className="stat-value text-secondary">{inUse}</div>
            <div className="stat-desc">Currently active</div>
          </div>

          <div className="stat">
            <div className="stat-title">Maintenance</div>
            <div className="stat-value text-warning">{maintenance}</div>
            <div className="stat-desc">Needs attention</div>
          </div>

          <div className="stat">
            <div className="stat-title">Total Value</div>
            <div className="stat-value text-accent">${totalCost}</div>
            <div className="stat-desc">Equipment cost</div>
          </div>
        </div>

        {/* Equipment List */}
        {equipment.length === 0 ? (
          <div className="card bg-base-100 shadow-xl">
            <div className="card-body text-center py-12">
              <h3 className="text-2xl font-bold mb-2">No equipment yet</h3>
              <p className="text-base-content/70 mb-6">
                Start tracking your bakery equipment
              </p>
              <div>
                <Link href="/dashboard/equipment/new" className="btn btn-primary">
                  <Plus className="h-4 w-4" />
                  Add Your First Equipment
                </Link>
              </div>
            </div>
          </div>
        ) : (
          <div className="card bg-base-100 shadow-xl">
            <div className="card-body">
              <div className="overflow-x-auto">
                <table className="table table-zebra">
                  <thead>
                    <tr>
                      <th>Name</th>
                      <th>Status</th>
                      <th>Quantity</th>
                      <th>Vendor</th>
                      <th>Cost</th>
                      <th>Purchase Date</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {equipment.map((item) => (
                      <tr key={item.id}>
                        <td>
                          <Link
                            href={`/dashboard/equipment/${item.id}`}
                            className="font-semibold hover:text-primary"
                          >
                            {item.name}
                          </Link>
                          {item.serialNumber && (
                            <p className="text-sm text-base-content/50">
                              S/N: {item.serialNumber}
                            </p>
                          )}
                        </td>
                        <td>
                          <span className={`badge ${getStatusBadgeClass(item.status)}`}>
                            {item.status}
                          </span>
                        </td>
                        <td>
                          <span className="badge badge-outline gap-1">
                            <Package className="h-3 w-3" />
                            {item.quantity}
                          </span>
                        </td>
                        <td>
                          {item.vendor ? (
                            <Link
                              href={`/dashboard/vendors/${item.vendor.id}`}
                              className="link link-hover"
                            >
                              {item.vendor.name}
                            </Link>
                          ) : (
                            <span className="text-base-content/50">No vendor</span>
                          )}
                        </td>
                        <td>
                          {item.cost ? (
                            <span className="font-semibold">
                              ${Number(item.cost).toFixed(2)}
                            </span>
                          ) : (
                            '-'
                          )}
                        </td>
                        <td>
                          {item.purchaseDate
                            ? new Date(item.purchaseDate).toLocaleDateString()
                            : '-'}
                        </td>
                        <td>
                          <Link
                            href={`/dashboard/equipment/${item.id}/edit`}
                            className="btn btn-ghost btn-xs"
                          >
                            Edit
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
      </div>
    </DashboardLayout>
  );
}
