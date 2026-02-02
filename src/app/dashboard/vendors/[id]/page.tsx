import { getCurrentUser } from '@/lib/clerk';
import { redirect } from 'next/navigation';
import { SetPageHeader } from '@/components/layout/SetPageHeader';
import { getVendorById } from '@/app/actions/vendor';
import Link from 'next/link';
import { Edit, Mail, Phone, Globe, Package, Wrench, FileText } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';

export default async function VendorDetailPage({
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

  const vendorResult = await getVendorById(id);

  if (!vendorResult.success || !vendorResult.data) {
    redirect('/dashboard/vendors');
  }

  const vendor = vendorResult.data;
  const ingredientCount = vendor._count.ingredients;
  const equipmentCount = vendor._count.equipment;

  return (
    <div className="space-y-6">
        <SetPageHeader
          title={vendor.name}
          description="Vendor details and linked items"
          actions={
            <Link
              href={`/dashboard/vendors/${id}/edit`}
              className="btn btn-primary btn-sm"
            >
              <Edit className="h-4 w-4" />
              Edit
            </Link>
          }
        />

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Contact Information Card */}
          <div className="lg:col-span-2 card bg-base-100 shadow-xl">
            <div className="card-body">
              <h2 className="card-title">Contact Information</h2>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
                {vendor.email && (
                  <div>
                    <p className="text-sm text-base-content/70">Email</p>
                    <a
                      href={`mailto:${vendor.email}`}
                      className="flex items-center gap-2 hover:text-primary"
                    >
                      <Mail className="h-4 w-4" />
                      <span>{vendor.email}</span>
                    </a>
                  </div>
                )}

                {vendor.phone && (
                  <div>
                    <p className="text-sm text-base-content/70">Phone</p>
                    <a
                      href={`tel:${vendor.phone}`}
                      className="flex items-center gap-2 hover:text-primary"
                    >
                      <Phone className="h-4 w-4" />
                      <span>{vendor.phone}</span>
                    </a>
                  </div>
                )}

                {vendor.website && (
                  <div>
                    <p className="text-sm text-base-content/70">Website</p>
                    <a
                      href={vendor.website}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-2 hover:text-primary"
                    >
                      <Globe className="h-4 w-4" />
                      <span className="truncate">{vendor.website}</span>
                    </a>
                  </div>
                )}
              </div>

              {vendor.notes && (
                <div className="mt-4">
                  <p className="text-sm text-base-content/70">Notes</p>
                  <div className="flex items-start gap-2 mt-1">
                    <FileText className="h-4 w-4 mt-1 flex-shrink-0" />
                    <p className="whitespace-pre-line text-base-content/80">
                      {vendor.notes}
                    </p>
                  </div>
                </div>
              )}

              <div className="mt-4 pt-4 border-t border-base-300">
                <p className="text-sm text-base-content/70">
                  Last Updated: {formatDistanceToNow(new Date(vendor.updatedAt), { addSuffix: true })}
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
                <div className="stat-title">Ingredients</div>
                <div className="stat-value text-primary">{ingredientCount}</div>
                <div className="stat-desc">Linked items</div>
              </div>

              <div className="stat">
                <div className="stat-figure text-secondary">
                  <Wrench className="h-8 w-8" />
                </div>
                <div className="stat-title">Equipment</div>
                <div className="stat-value text-secondary">{equipmentCount}</div>
                <div className="stat-desc">Linked items</div>
              </div>
            </div>
          </div>
        </div>

        {/* Linked Ingredients */}
        {vendor.ingredients.length > 0 && (
          <div className="card bg-base-100 shadow-xl">
            <div className="card-body">
              <h2 className="card-title">Linked Ingredients</h2>
              <div className="overflow-x-auto">
                <table className="table table-zebra">
                  <thead>
                    <tr>
                      <th>Name</th>
                      <th>Unit</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {vendor.ingredients.map((iv) => (
                      <tr key={iv.ingredient.id}>
                        <td>
                          <Link
                            href={`/dashboard/ingredients/${iv.ingredient.id}`}
                            className="font-semibold hover:text-primary"
                          >
                            {iv.ingredient.name}
                          </Link>
                        </td>
                        <td>{iv.ingredient.unit}</td>
                        <td>
                          <Link
                            href={`/dashboard/ingredients/${iv.ingredient.id}`}
                            className="btn btn-ghost btn-xs"
                          >
                            View
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

        {/* Recent Purchases from this Vendor */}
        {vendor.inventoryLots && vendor.inventoryLots.length > 0 && (
          <div className="card bg-base-100 shadow-xl">
            <div className="card-body">
              <h2 className="card-title">Recent Purchases</h2>
              <div className="overflow-x-auto">
                <table className="table table-zebra">
                  <thead>
                    <tr>
                      <th>Date</th>
                      <th>Ingredient</th>
                      <th>Quantity</th>
                      <th>Cost/Unit</th>
                      <th>Remaining</th>
                    </tr>
                  </thead>
                  <tbody>
                    {vendor.inventoryLots.map((lot) => (
                      <tr key={lot.id}>
                        <td>{formatDistanceToNow(new Date(lot.purchasedAt), { addSuffix: true })}</td>
                        <td>
                          <Link
                            href={`/dashboard/ingredients/${lot.inventory.ingredient.id}`}
                            className="font-semibold hover:text-primary"
                          >
                            {lot.inventory.ingredient.name}
                          </Link>
                        </td>
                        <td>
                          {lot.purchaseQty.toFixed(2)} {lot.purchaseUnit}
                        </td>
                        <td>${lot.costPerUnit.toFixed(2)}/{lot.purchaseUnit}</td>
                        <td>
                          {lot.remainingQty.toFixed(2)} {lot.purchaseUnit}
                          {lot.remainingQty <= 0 && (
                            <span className="badge badge-ghost badge-sm ml-2">Depleted</span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* Linked Equipment */}
        {vendor.equipment.length > 0 && (
          <div className="card bg-base-100 shadow-xl">
            <div className="card-body">
              <h2 className="card-title">Linked Equipment</h2>
              <div className="overflow-x-auto">
                <table className="table table-zebra">
                  <thead>
                    <tr>
                      <th>Name</th>
                      <th>Status</th>
                      <th>Cost</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {vendor.equipment.map((item) => (
                      <tr key={item.id}>
                        <td>
                          <Link
                            href={`/dashboard/equipment/${item.id}`}
                            className="font-semibold hover:text-primary"
                          >
                            {item.name}
                          </Link>
                        </td>
                        <td>
                          <span className="badge badge-info">{item.status}</span>
                        </td>
                        <td>
                          {item.cost
                            ? `$${Number(item.cost).toFixed(2)}`
                            : '-'}
                        </td>
                        <td>
                          <Link
                            href={`/dashboard/equipment/${item.id}`}
                            className="btn btn-ghost btn-xs"
                          >
                            View
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

        {/* Empty State */}
        {vendor.ingredients.length === 0 && vendor.equipment.length === 0 && (
          <div className="card bg-base-100 shadow-xl">
            <div className="card-body text-center py-12">
              <h3 className="text-xl font-bold mb-2">No linked items</h3>
              <p className="text-base-content/70 mb-6">
                This vendor has no linked ingredients or equipment yet
              </p>
              <div className="flex gap-3 justify-center">
                <Link href="/dashboard/ingredients/new" className="btn btn-primary">
                  <Package className="h-4 w-4" />
                  Add Ingredient
                </Link>
                <Link href="/dashboard/equipment/new" className="btn btn-secondary">
                  <Wrench className="h-4 w-4" />
                  Add Equipment
                </Link>
              </div>
            </div>
          </div>
        )}
      </div>
  );
}
