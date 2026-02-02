import { getCurrentUser } from '@/lib/clerk';
import { redirect } from 'next/navigation';
import { SetPageHeader } from '@/components/layout/SetPageHeader';
import { getVendorById } from '@/app/actions/vendor';
import Link from 'next/link';
import { Mail, Phone, Globe, Package, Wrench } from 'lucide-react';
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
    <>
      <SetPageHeader
        title={vendor.name}
        breadcrumbs={[
          { label: 'Vendors', href: '/dashboard/vendors' },
          { label: vendor.name },
        ]}
        actions={
          <Link
            href={`/dashboard/vendors/${id}/edit`}
            className="btn btn-primary"
          >
            Edit
          </Link>
        }
      />

      <div className="space-y-8">
        {/* Overview Stats */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <div>
            <p className="text-sm text-base-content/70">Ingredients</p>
            <p className="text-2xl font-bold">{ingredientCount}</p>
          </div>
          <div>
            <p className="text-sm text-base-content/70">Equipment</p>
            <p className="text-2xl font-bold">{equipmentCount}</p>
          </div>
          <div>
            <p className="text-sm text-base-content/70">Recent Purchases</p>
            <p className="text-2xl font-bold">{vendor.inventoryLots?.length || 0}</p>
          </div>
          <div>
            <p className="text-sm text-base-content/70">Last Updated</p>
            <p className="text-sm">{formatDistanceToNow(new Date(vendor.updatedAt), { addSuffix: true })}</p>
          </div>
        </div>

        {/* Contact Information */}
        <section className="space-y-4">
          <h2 className="text-xl font-semibold">Contact Information</h2>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
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

            {!vendor.email && !vendor.phone && !vendor.website && (
              <p className="text-base-content/50 italic">No contact information</p>
            )}
          </div>

          {vendor.notes && (
            <div>
              <p className="text-sm text-base-content/70">Notes</p>
              <p className="whitespace-pre-line text-base-content/80 mt-1">
                {vendor.notes}
              </p>
            </div>
          )}
        </section>

        {/* Linked Ingredients */}
        {vendor.ingredients.length > 0 && (
          <section className="space-y-4">
            <h2 className="text-xl font-semibold">Linked Ingredients</h2>
            <div className="overflow-x-auto">
              <table className="table table-zebra">
                <thead>
                  <tr>
                    <th>Name</th>
                    <th>Unit</th>
                  </tr>
                </thead>
                <tbody>
                  {vendor.ingredients.map((iv) => (
                    <tr key={iv.ingredient.id} className="hover">
                      <td>
                        <Link
                          href={`/dashboard/ingredients/${iv.ingredient.id}`}
                          className="font-semibold hover:text-primary"
                        >
                          {iv.ingredient.name}
                        </Link>
                      </td>
                      <td>{iv.ingredient.unit}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        )}

        {/* Recent Purchases */}
        {vendor.inventoryLots && vendor.inventoryLots.length > 0 && (
          <section className="space-y-4">
            <h2 className="text-xl font-semibold">Recent Purchases</h2>
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
                    <tr key={lot.id} className="hover">
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
          </section>
        )}

        {/* Linked Equipment */}
        {vendor.equipment.length > 0 && (
          <section className="space-y-4">
            <h2 className="text-xl font-semibold">Linked Equipment</h2>
            <div className="overflow-x-auto">
              <table className="table table-zebra">
                <thead>
                  <tr>
                    <th>Name</th>
                    <th>Status</th>
                    <th>Cost</th>
                  </tr>
                </thead>
                <tbody>
                  {vendor.equipment.map((item) => (
                    <tr key={item.id} className="hover">
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
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        )}

        {/* Empty State */}
        {vendor.ingredients.length === 0 && vendor.equipment.length === 0 && (
          <div className="text-center py-12">
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
        )}
      </div>
    </>
  );
}
