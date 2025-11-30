import { getCurrentUser } from '@/lib/clerk';
import { redirect } from 'next/navigation';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { PageHeader } from '@/components/ui/PageHeader';
import { EmptyState } from '@/components/ui/EmptyState';
import { getIngredientsByBakery } from '@/app/actions/ingredient';
import Link from 'next/link';
import { Plus, Package } from 'lucide-react';

export default async function IngredientsPage() {
  const user = await getCurrentUser();

  if (!user) {
    redirect('/sign-in');
  }

  if (!user.bakeryId) {
    redirect('/dashboard');
  }

  const ingredientsResult = await getIngredientsByBakery(user.bakeryId);
  const ingredients = ingredientsResult.success ? ingredientsResult.data! : [];

  return (
    <DashboardLayout
      isPlatformAdmin={user.isPlatformAdmin}
      bakeries={user.allBakeries}
      currentBakeryId={user.bakeryId}
    >
      <div className="space-y-6">
        <PageHeader
          title="Ingredients"
          description="Manage your bakery's ingredient inventory"
          actions={
            <Link href="/dashboard/ingredients/new" className="btn btn-primary">
              <Plus className="h-4 w-4" />
              Add Ingredient
            </Link>
          }
        />

        {ingredients.length === 0 ? (
          <EmptyState
            icon={Package}
            title="No ingredients yet"
            description="Start by adding your first ingredient to track inventory and costs."
            action={
              <Link href="/dashboard/ingredients/new" className="btn btn-primary">
                <Plus className="h-4 w-4" />
                Add First Ingredient
              </Link>
            }
          />
        ) : (
          <div className="card bg-base-100 shadow-xl">
            <div className="card-body p-0">
              <div className="overflow-x-auto">
                <table className="table table-zebra">
                  <thead>
                    <tr>
                      <th>Name</th>
                      <th>Current Qty</th>
                      <th>Unit</th>
                      <th>Cost per Unit</th>
                      <th>Vendor</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {ingredients.map((ingredient) => {
                      const currentQty = Number(ingredient.currentQty);
                      const costPerUnit = Number(ingredient.costPerUnit);
                      const isLowStock = currentQty < 100; // Simple low stock threshold

                      return (
                        <tr key={ingredient.id}>
                          <td>
                            <div className="flex items-center gap-2">
                              {ingredient.name}
                              {isLowStock && (
                                <span className="badge badge-warning badge-sm">Low Stock</span>
                              )}
                            </div>
                          </td>
                          <td>
                            <span className={isLowStock ? 'text-warning font-semibold' : ''}>
                              {currentQty.toFixed(3)}
                            </span>
                          </td>
                          <td>{ingredient.unit}</td>
                          <td>${costPerUnit.toFixed(2)}</td>
                          <td>
                            {ingredient.vendor ? (
                              <span className="badge badge-ghost">{ingredient.vendor.name}</span>
                            ) : (
                              <span className="text-base-content/50">No vendor</span>
                            )}
                          </td>
                          <td>
                            <div className="flex gap-2">
                              <Link
                                href={`/dashboard/ingredients/${ingredient.id}`}
                                className="btn btn-ghost btn-sm"
                              >
                                View
                              </Link>
                              <Link
                                href={`/dashboard/ingredients/${ingredient.id}/edit`}
                                className="btn btn-ghost btn-sm"
                              >
                                Edit
                              </Link>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        <div className="stats shadow">
          <div className="stat">
            <div className="stat-figure text-primary">
              <Package className="h-8 w-8" />
            </div>
            <div className="stat-title">Total Ingredients</div>
            <div className="stat-value text-primary">{ingredients.length}</div>
          </div>

          <div className="stat">
            <div className="stat-title">Low Stock Items</div>
            <div className="stat-value text-warning">
              {ingredients.filter((i) => Number(i.currentQty) < 100).length}
            </div>
          </div>

          <div className="stat">
            <div className="stat-title">Total Inventory Value</div>
            <div className="stat-value text-success">
              $
              {ingredients
                .reduce(
                  (sum, i) => sum + Number(i.currentQty) * Number(i.costPerUnit),
                  0
                )
                .toFixed(2)}
            </div>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
