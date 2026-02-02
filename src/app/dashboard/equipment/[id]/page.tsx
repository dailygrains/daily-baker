import { getCurrentUser } from '@/lib/clerk';
import { redirect } from 'next/navigation';
import { SetPageHeader } from '@/components/layout/SetPageHeader';
import { getEquipmentById } from '@/app/actions/equipment';
import Link from 'next/link';
import { Calendar, Hash, Mail, Phone } from 'lucide-react';
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
  const totalValue = cost * equipment.quantity;

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
    <>
      <SetPageHeader
        title={equipment.name}
        breadcrumbs={[
          { label: 'Equipment', href: '/dashboard/equipment' },
          { label: equipment.name },
        ]}
        actions={
          <Link
            href={`/dashboard/equipment/${id}/edit`}
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
            <p className="text-sm text-base-content/70">Status</p>
            <span className={`badge ${getStatusBadgeClass(equipment.status)} badge-lg mt-1`}>
              {equipment.status}
            </span>
          </div>

          <div>
            <p className="text-sm text-base-content/70">Quantity</p>
            <p className="text-2xl font-bold">{equipment.quantity}</p>
          </div>

          {equipment.cost && (
            <div>
              <p className="text-sm text-base-content/70">Unit Cost</p>
              <p className="text-2xl font-bold">${cost.toFixed(2)}</p>
            </div>
          )}

          {equipment.cost && (
            <div>
              <p className="text-sm text-base-content/70">Total Value</p>
              <p className="text-2xl font-bold text-success">${totalValue.toFixed(2)}</p>
            </div>
          )}

          {equipment.purchaseDate && (
            <div>
              <p className="text-sm text-base-content/70">Purchase Date</p>
              <div className="flex items-center gap-2 mt-1">
                <Calendar className="h-4 w-4 text-base-content/70" />
                <p>{new Date(equipment.purchaseDate).toLocaleDateString()}</p>
              </div>
            </div>
          )}

          <div>
            <p className="text-sm text-base-content/70">Last Updated</p>
            <p className="text-sm">{formatDistanceToNow(new Date(equipment.updatedAt), { addSuffix: true })}</p>
          </div>
        </div>

        {/* Details */}
        <section className="space-y-4">
          <h2 className="text-xl font-semibold">Details</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {equipment.serialNumber && (
              <div>
                <p className="text-sm text-base-content/70">Serial Number</p>
                <div className="flex items-center gap-2 mt-1">
                  <Hash className="h-4 w-4 text-base-content/70" />
                  <p className="font-mono">{equipment.serialNumber}</p>
                </div>
              </div>
            )}

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
          </div>

          {equipment.notes && (
            <div>
              <p className="text-sm text-base-content/70">Notes</p>
              <p className="whitespace-pre-line text-base-content/80 mt-1">
                {equipment.notes}
              </p>
            </div>
          )}
        </section>

        {/* Vendor Contact */}
        {equipment.vendor && (equipment.vendor.email || equipment.vendor.phone) && (
          <section className="space-y-4">
            <h2 className="text-xl font-semibold">Vendor Contact</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {equipment.vendor.email && (
                <div>
                  <p className="text-sm text-base-content/70">Email</p>
                  <a
                    href={`mailto:${equipment.vendor.email}`}
                    className="flex items-center gap-2 hover:text-primary"
                  >
                    <Mail className="h-4 w-4" />
                    {equipment.vendor.email}
                  </a>
                </div>
              )}
              {equipment.vendor.phone && (
                <div>
                  <p className="text-sm text-base-content/70">Phone</p>
                  <a
                    href={`tel:${equipment.vendor.phone}`}
                    className="flex items-center gap-2 hover:text-primary"
                  >
                    <Phone className="h-4 w-4" />
                    {equipment.vendor.phone}
                  </a>
                </div>
              )}
            </div>
          </section>
        )}
      </div>
    </>
  );
}
