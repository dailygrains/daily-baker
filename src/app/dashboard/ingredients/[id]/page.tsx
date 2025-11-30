import { getCurrentUser } from '@/lib/clerk';
import { redirect } from 'next/navigation';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { PageHeader } from '@/components/ui/PageHeader';
import { getIngredientById } from '@/app/actions/ingredient';
import Link from 'next/link';
import { Edit, Package, TrendingUp, ShoppingCart } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';

export default async function IngredientDetailPage({
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

  const ingredientResult = await getIngredientById(id);

  if (!ingredientResult.success || !ingredientResult.data) {
    redirect('/dashboard/ingredients');
  }

  const ingredient = ingredientResult.data;

  // Calculate total inventory across all batches
  const totalInventory = ingredient.inventoryItems.reduce(
    (sum, item) => sum + Number(item.quantity),
    0
  );

  // Calculate total value across all batches
  const totalValue = ingredient.inventoryItems.reduce(
    (sum, item) => sum + (Number(item.quantity) * (Number(item.purchasePrice) || 0)),
    0
  );

  // Check if below reorder level
  const needsReorder = ingredient.reorderLevel !== null && totalInventory < ingredient.reorderLevel;

  return (
    <DashboardLayout
      isPlatformAdmin={user.isPlatformAdmin}
      bakeries={user.allBakeries}
      currentBakeryId={user.bakeryId}
    >
      <PageHeader
        title={ingredient.name}
        sticky
        actions={
          <Link
            href={`/dashboard/ingredients/${id}/edit`}
            className="btn btn-primary"
          >
            <Edit className="h-5 w-5 mr-2" />
            Edit
          </Link>
        }
      />

      <div className="space-y-6">

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main Info Card */}
          <div className="lg:col-span-2 card bg-base-100 shadow-xl">
            <div className="card-body">
              <h2 className="card-title">Ingredient Information</h2>

              <div className="grid grid-cols-2 gap-4 mt-4">
                <div>
                  <p className="text-sm text-base-content/70">Category</p>
                  {ingredient.category ? (
                    <p className="text-lg font-semibold">{ingredient.category}</p>
                  ) : (
                    <p className="text-sm text-base-content/50 italic">No category</p>
                  )}
                </div>

                <div>
                  <p className="text-sm text-base-content/70">Default Unit</p>
                  <p className="text-lg font-semibold">{ingredient.defaultUnit}</p>
                </div>

                <div>
                  <p className="text-sm text-base-content/70">Reorder Level</p>
                  {ingredient.reorderLevel !== null ? (
                    <>
                      <p className="text-lg font-semibold">
                        {ingredient.reorderLevel} {ingredient.defaultUnit}
                      </p>
                      {needsReorder && (
                        <p className="text-sm text-warning mt-1">Below reorder level</p>
                      )}
                    </>
                  ) : (
                    <p className="text-sm text-base-content/50 italic">Not set</p>
                  )}
                </div>

                <div>
                  <p className="text-sm text-base-content/70">Total Inventory</p>
                  <p className={`text-2xl font-bold ${needsReorder ? 'text-warning' : ''}`}>
                    {totalInventory.toFixed(3)} {ingredient.defaultUnit}
                  </p>
                </div>

                {ingredient.description && (
                  <div className="col-span-2">
                    <p className="text-sm text-base-content/70">Description</p>
                    <p className="text-sm">{ingredient.description}</p>
                  </div>
                )}

                <div>
                  <p className="text-sm text-base-content/70">Vendors</p>
                  {ingredient.vendors.length > 0 ? (
                    <div className="flex flex-wrap gap-1 mt-1">
                      {ingredient.vendors.map((iv) => (
                        <span key={iv.vendor.id} className="badge badge-ghost">
                          {iv.vendor.name}
                        </span>
                      ))}
                    </div>
                  ) : (
                    <p className="text-sm text-base-content/50 italic">No vendors</p>
                  )}
                </div>

                <div>
                  <p className="text-sm text-base-content/70">Used in Recipes</p>
                  <p className="text-lg font-semibold">
                    {ingredient._count.recipeUses} recipe(s)
                  </p>
                </div>

                <div>
                  <p className="text-sm text-base-content/70">Last Updated</p>
                  <p className="text-sm">
                    {formatDistanceToNow(new Date(ingredient.updatedAt), { addSuffix: true })}
                  </p>
                </div>
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
                <div className="stat-title">Total Stock</div>
                <div className="stat-value text-primary">{totalInventory.toFixed(1)}</div>
                <div className="stat-desc">{ingredient.defaultUnit}</div>
              </div>

              <div className="stat">
                <div className="stat-figure text-secondary">
                  <ShoppingCart className="h-8 w-8" />
                </div>
                <div className="stat-title">Inventory Batches</div>
                <div className="stat-value text-secondary">{ingredient.inventoryItems.length}</div>
                <div className="stat-desc">Active batches</div>
              </div>

              <div className="stat">
                <div className="stat-figure text-accent">
                  <TrendingUp className="h-8 w-8" />
                </div>
                <div className="stat-title">Total Value</div>
                <div className="stat-value text-accent">${totalValue.toFixed(2)}</div>
                <div className="stat-desc">At purchase prices</div>
              </div>
            </div>
          </div>
        </div>

        {/* Inventory Batches */}
        {ingredient.inventoryItems.length > 0 ? (
          <div>
            <h2 className="text-xl font-semibold mb-4">Inventory Batches</h2>
            <div className="overflow-x-auto">
              <table className="table table-zebra">
                <thead>
                  <tr>
                    <th>Vendor</th>
                    <th>Quantity</th>
                    <th>Unit</th>
                    <th>Purchase Price</th>
                    <th>Batch #</th>
                    <th>Location</th>
                    <th>Expires</th>
                    <th>Added</th>
                  </tr>
                </thead>
                <tbody>
                  {ingredient.inventoryItems.map((item) => (
                    <tr key={item.id}>
                      <td className="align-top">
                        {item.vendor ? (
                          <span className="badge badge-ghost">{item.vendor.name}</span>
                        ) : (
                          <span className="text-base-content/40 italic">-</span>
                        )}
                      </td>
                      <td className="align-top font-semibold">
                        {Number(item.quantity).toFixed(3)}
                      </td>
                      <td className="align-top">{item.unit}</td>
                      <td className="align-top">
                        {item.purchasePrice !== null ? (
                          `$${Number(item.purchasePrice).toFixed(2)}`
                        ) : (
                          <span className="text-base-content/40 italic">-</span>
                        )}
                      </td>
                      <td className="align-top">
                        {item.batchNumber || (
                          <span className="text-base-content/40 italic">-</span>
                        )}
                      </td>
                      <td className="align-top">
                        {item.location || (
                          <span className="text-base-content/40 italic">-</span>
                        )}
                      </td>
                      <td className="align-top">
                        {item.expirationDate ? (
                          formatDistanceToNow(new Date(item.expirationDate), {
                            addSuffix: true,
                          })
                        ) : (
                          <span className="text-base-content/40 italic">-</span>
                        )}
                      </td>
                      <td className="align-top">
                        {formatDistanceToNow(new Date(item.createdAt), {
                          addSuffix: true,
                        })}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        ) : (
          <div className="alert alert-info">
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" className="stroke-current shrink-0 w-6 h-6">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path>
            </svg>
            <span>No inventory batches yet. Add inventory items to track stock for this ingredient.</span>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
