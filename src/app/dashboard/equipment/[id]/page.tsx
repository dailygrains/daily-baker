import { getCurrentUser } from '@/lib/clerk';
import { redirect } from 'next/navigation';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { PageHeader } from '@/components/ui/PageHeader';
import { getEquipmentById } from '@/app/actions/equipment';
import Link from 'next/link';
import { Edit, DollarSign, Package, Calendar, Hash } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';

export default async function EquipmentDetailPage({
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

  const equipmentResult = await getEquipmentById(id);

  if (!equipmentResult.success || !equipmentResult.data) {
    redirect('/dashboard/equipment');
  }

  const equipment = equipmentResult.data;
  const cost = equipment.cost ? Number(equipment.cost) : 0;

  // Status badge color
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
          title={equipment.name}
          description="Equipment details and information"
          actions={
            <Link
              href={`/dashboard/equipment/${id}/edit`}
              className="btn btn-primary btn-sm"
            >
              <Edit className="h-4 w-4" />
              Edit
            </Link>
          }
        />

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main Info Card */}
          <div className="lg:col-span-2 card bg-base-100 shadow-xl">
            <div className="card-body">
              <h2 className="card-title">Equipment Information</h2>

              <div className="grid grid-cols-2 gap-4 mt-4">
                <div>
                  <p className="text-sm text-base-content/70">Status</p>
                  <span className={`badge ${getStatusBadgeClass(equipment.status)} badge-lg mt-1`}>
                    {equipment.status}
                  </span>
                </div>

                <div>
                  <p className="text-sm text-base-content/70">Quantity</p>
                  <div className="flex items-center gap-2 mt-1">
                    <Package className="h-5 w-5 text-base-content/70" />
                    <p className="text-2xl font-bold">{equipment.quantity}</p>
                  </div>
                </div>

                {equipment.vendor && (
                  <div>
                    <p className="text-sm text-base-content/70">Vendor</p>
                    <Link
                      href={`/dashboard/vendors/${equipment.vendor.id}`}
                      className="text-lg font-semibold hover:text-primary"
                    >
                      {equipment.vendor.name}
                    </Link>
                  </div>
                )}

                {equipment.cost && (
                  <div>
                    <p className="text-sm text-base-content/70">Cost</p>
                    <p className="text-2xl font-bold text-success">${cost.toFixed(2)}</p>
                  </div>
                )}

                {equipment.purchaseDate && (
                  <div>
                    <p className="text-sm text-base-content/70">Purchase Date</p>
                    <div className="flex items-center gap-2 mt-1">
                      <Calendar className="h-4 w-4 text-base-content/70" />
                      <p className="text-lg">
                        {new Date(equipment.purchaseDate).toLocaleDateString()}
                      </p>
                    </div>
                  </div>
                )}

                {equipment.serialNumber && (
                  <div>
                    <p className="text-sm text-base-content/70">Serial Number</p>
                    <div className="flex items-center gap-2 mt-1">
                      <Hash className="h-4 w-4 text-base-content/70" />
                      <p className="font-mono">{equipment.serialNumber}</p>
                    </div>
                  </div>
                )}
              </div>

              {equipment.notes && (
                <div className="mt-4 pt-4 border-t border-base-300">
                  <p className="text-sm text-base-content/70 mb-2">Notes</p>
                  <p className="whitespace-pre-line text-base-content/80">
                    {equipment.notes}
                  </p>
                </div>
              )}

              <div className="mt-4 pt-4 border-t border-base-300">
                <p className="text-sm text-base-content/70">
                  Last Updated: {formatDistanceToNow(new Date(equipment.updatedAt), { addSuffix: true })}
                </p>
              </div>
            </div>
          </div>

          {/* Stats Card */}
          <div className="space-y-4">
            <div className="stats stats-vertical shadow">
              <div className="stat">
                <div className="stat-figure text-primary">
                  <Package className="h-8 w-8" />
                </div>
                <div className="stat-title">Quantity</div>
                <div className="stat-value text-primary">{equipment.quantity}</div>
                <div className="stat-desc">Units owned</div>
              </div>

              {equipment.cost && (
                <div className="stat">
                  <div className="stat-figure text-secondary">
                    <DollarSign className="h-8 w-8" />
                  </div>
                  <div className="stat-title">Total Value</div>
                  <div className="stat-value text-secondary">
                    ${(cost * equipment.quantity).toFixed(2)}
                  </div>
                  <div className="stat-desc">
                    ${cost.toFixed(2)} × {equipment.quantity}
                  </div>
                </div>
              )}
            </div>

            {/* Vendor Contact Card */}
            {equipment.vendor && (
              <div className="card bg-base-100 shadow">
                <div className="card-body">
                  <h3 className="card-title text-sm">Vendor Contact</h3>
                  <div className="space-y-2 text-sm">
                    <Link
                      href={`/dashboard/vendors/${equipment.vendor.id}`}
                      className="font-semibold hover:text-primary"
                    >
                      {equipment.vendor.name}
                    </Link>
                    {equipment.vendor.email && (
                      <a
                        href={`mailto:${equipment.vendor.email}`}
                        className="link link-hover flex items-center gap-1"
                      >
                        {equipment.vendor.email}
                      </a>
                    )}
                    {equipment.vendor.phone && (
                      <a
                        href={`tel:${equipment.vendor.phone}`}
                        className="link link-hover flex items-center gap-1"
                      >
                        {equipment.vendor.phone}
                      </a>
                    )}
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
