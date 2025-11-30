import { getCurrentUser } from '@/lib/clerk';
import { redirect } from 'next/navigation';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { PageHeader } from '@/components/ui/PageHeader';
import { getVendorsByBakery } from '@/app/actions/vendor';
import Link from 'next/link';
import { Plus, Mail, Phone, Globe, Package, Wrench } from 'lucide-react';

export default async function VendorsPage() {
  const user = await getCurrentUser();

  if (!user) {
    redirect('/sign-in');
  }

  if (!user.bakeryId) {
    redirect('/dashboard');
  }

  const vendorsResult = await getVendorsByBakery(user.bakeryId);

  if (!vendorsResult.success) {
    return (
      <DashboardLayout
        isPlatformAdmin={user.isPlatformAdmin}
        bakeries={user.allBakeries}
        currentBakeryId={user.bakeryId}
      >
        <div className="alert alert-error">
          <span>{vendorsResult.error}</span>
        </div>
      </DashboardLayout>
    );
  }

  const vendors = vendorsResult.data || [];
  const totalVendors = vendors.length;
  const vendorsWithEmail = vendors.filter((v) => v.email).length;
  const vendorsWithPhone = vendors.filter((v) => v.phone).length;

  return (
    <DashboardLayout
      isPlatformAdmin={user.isPlatformAdmin}
      bakeries={user.allBakeries}
      currentBakeryId={user.bakeryId}
    >
      <div className="space-y-6">
        <PageHeader
          title="Vendors"
          description="Manage your suppliers and service providers"
          actions={
            <Link href="/dashboard/vendors/new" className="btn btn-primary">
              <Plus className="h-4 w-4" />
              Add Vendor
            </Link>
          }
        />

        {/* Stats */}
        <div className="stats stats-horizontal shadow w-full">
          <div className="stat">
            <div className="stat-title">Total Vendors</div>
            <div className="stat-value text-primary">{totalVendors}</div>
            <div className="stat-desc">Active suppliers</div>
          </div>

          <div className="stat">
            <div className="stat-title">With Email</div>
            <div className="stat-value text-secondary">{vendorsWithEmail}</div>
            <div className="stat-desc">Email contacts available</div>
          </div>

          <div className="stat">
            <div className="stat-title">With Phone</div>
            <div className="stat-value text-accent">{vendorsWithPhone}</div>
            <div className="stat-desc">Phone contacts available</div>
          </div>
        </div>

        {/* Vendors List */}
        {vendors.length === 0 ? (
          <div className="card bg-base-100 shadow-xl">
            <div className="card-body text-center py-12">
              <h3 className="text-2xl font-bold mb-2">No vendors yet</h3>
              <p className="text-base-content/70 mb-6">
                Get started by adding your first vendor
              </p>
              <div>
                <Link href="/dashboard/vendors/new" className="btn btn-primary">
                  <Plus className="h-4 w-4" />
                  Add Your First Vendor
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
                      <th>Vendor Name</th>
                      <th>Contact</th>
                      <th>Email</th>
                      <th>Phone</th>
                      <th>Linked Items</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {vendors.map((vendor) => (
                      <tr key={vendor.id}>
                        <td>
                          <Link
                            href={`/dashboard/vendors/${vendor.id}`}
                            className="font-semibold hover:text-primary"
                          >
                            {vendor.name}
                          </Link>
                          {vendor.website && (
                            <a
                              href={vendor.website}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="ml-2 text-sm text-base-content/50 hover:text-primary"
                            >
                              <Globe className="h-4 w-4 inline" />
                            </a>
                          )}
                        </td>
                        <td>-</td>
                        <td>
                          {vendor.email ? (
                            <a
                              href={`mailto:${vendor.email}`}
                              className="flex items-center gap-1 hover:text-primary"
                            >
                              <Mail className="h-4 w-4" />
                              <span className="text-sm">{vendor.email}</span>
                            </a>
                          ) : (
                            '-'
                          )}
                        </td>
                        <td>
                          {vendor.phone ? (
                            <a
                              href={`tel:${vendor.phone}`}
                              className="flex items-center gap-1 hover:text-primary"
                            >
                              <Phone className="h-4 w-4" />
                              <span className="text-sm">{vendor.phone}</span>
                            </a>
                          ) : (
                            '-'
                          )}
                        </td>
                        <td>
                          <div className="flex gap-3">
                            {vendor._count.ingredients > 0 && (
                              <span className="badge badge-primary gap-1">
                                <Package className="h-3 w-3" />
                                {vendor._count.ingredients}
                              </span>
                            )}
                            {vendor._count.equipment > 0 && (
                              <span className="badge badge-secondary gap-1">
                                <Wrench className="h-3 w-3" />
                                {vendor._count.equipment}
                              </span>
                            )}
                            {vendor._count.ingredients === 0 &&
                              vendor._count.equipment === 0 && (
                                <span className="text-base-content/50">None</span>
                              )}
                          </div>
                        </td>
                        <td>
                          <Link
                            href={`/dashboard/vendors/${vendor.id}/edit`}
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
