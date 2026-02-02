import { getCurrentUser } from '@/lib/clerk';
import { redirect } from 'next/navigation';
import { SetPageHeader } from '@/components/layout/SetPageHeader';
import { getIngredientsByBakery } from '@/app/actions/ingredient';
import { getRecentInventoryActivity } from '@/app/actions/inventory';
import { InventoryTable } from '@/components/inventory/InventoryTable';
import Link from 'next/link';
import { Package, TrendingUp, TrendingDown, AlertTriangle, Plus } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';

export default async function InventoryPage() {
  const user = await getCurrentUser();

  if (!user) {
    redirect('/sign-in');
  }

  if (!user.bakeryId) {
    redirect('/dashboard');
  }

  const ingredientsResult = await getIngredientsByBakery(user.bakeryId);
  const activityResult = await getRecentInventoryActivity(user.bakeryId, 10);

  if (!ingredientsResult.success) {
    return (
      <div className="alert alert-error">
        <span>{ingredientsResult.error}</span>
      </div>
    );
  }

  const ingredients = ingredientsResult.data || [];
  const recentActivity = activityResult.success ? activityResult.data || [] : [];

  // Calculate stats
  const totalIngredients = ingredients.length;
  const ingredientsWithInventory = ingredients.filter((ing) => ing.currentQty > 0).length;
  const totalValue = ingredients.reduce(
    (sum, ing) => sum + ing.currentQty * ing.costPerUnit,
    0
  );
  const totalLots = ingredients.reduce(
    (sum, ing) => sum + (ing._count?.lots ?? 0),
    0
  );

  // Get usage reason badge class
  const getUsageReasonBadgeClass = (reason: string) => {
    switch (reason) {
      case 'USE':
        return 'badge-info';
      case 'ADJUST':
        return 'badge-warning';
      case 'WASTE':
        return 'badge-error';
      default:
        return 'badge-ghost';
    }
  };

  // Get usage reason icon
  const getUsageReasonIcon = (reason: string) => {
    switch (reason) {
      case 'USE':
        return <TrendingDown className="h-4 w-4" />;
      case 'WASTE':
        return <AlertTriangle className="h-4 w-4" />;
      case 'ADJUST':
        return <Package className="h-4 w-4" />;
      default:
        return null;
    }
  };

  return (
    <div className="space-y-6">
      <SetPageHeader
        title="Inventory Management"
        description="Track ingredient quantities with FIFO lot-based inventory"
        actions={
          <Link href="/dashboard/inventory/lots/new" className="btn btn-primary">
            <Plus className="h-5 w-5 mr-2" />
            Add Inventory Lot
          </Link>
        }
      />

      {/* Stats */}
      <div className="card bg-base-100 p-4">
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
          <div>
            <p className="text-sm text-base-content/70">Total Ingredients</p>
            <p className="text-2xl font-bold text-primary">{totalIngredients}</p>
            <p className="text-sm text-base-content/60">{ingredientsWithInventory} with inventory</p>
          </div>
          <div>
            <p className="text-sm text-base-content/70">Inventory Lots</p>
            <p className="text-2xl font-bold">{totalLots}</p>
          </div>
          <div>
            <p className="text-sm text-base-content/70">Total Inventory Value</p>
            <p className="text-2xl font-bold text-success">${totalValue.toFixed(2)}</p>
          </div>
        </div>
      </div>

      <div className="space-y-8">
        {/* Current Inventory Table */}
        <section className="space-y-4">
          <div className="flex justify-between items-center">
            <h2 className="text-xl font-semibold">Current Inventory Levels</h2>
            <Link href="/dashboard/ingredients" className="btn btn-sm btn-ghost">
              Manage Ingredients
            </Link>
          </div>

          {ingredients.length === 0 ? (
            <div className="text-center py-12">
              <Package className="h-16 w-16 mx-auto text-base-content/30 mb-4" />
              <h3 className="text-lg font-semibold mb-2">No ingredients yet</h3>
              <p className="text-base-content/70 mb-4">
                Start by adding some ingredients to track
              </p>
              <Link href="/dashboard/ingredients/new" className="btn btn-primary">
                Add Ingredient
              </Link>
            </div>
          ) : (
            <InventoryTable ingredients={ingredients} />
          )}
        </section>

        {/* Recent Activity */}
        <section className="space-y-4">
          <h2 className="text-xl font-semibold">Recent Inventory Activity</h2>

          {recentActivity.length === 0 ? (
            <div className="text-center py-8">
              <TrendingUp className="h-12 w-12 mx-auto text-base-content/30 mb-2" />
              <p className="text-base-content/70">No recent activity</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="table">
                  <thead>
                    <tr>
                      <th>Type</th>
                      <th>Ingredient</th>
                      <th>Quantity</th>
                      <th>User</th>
                      <th>Time</th>
                    </tr>
                  </thead>
                  <tbody>
                    {recentActivity.map((activity) => (
                      <tr key={activity.id}>
                        <td>
                          <span
                            className={`badge ${getUsageReasonBadgeClass(activity.reason)} gap-2`}
                          >
                            {getUsageReasonIcon(activity.reason)}
                            {activity.reason}
                          </span>
                        </td>
                        <td>
                          <Link
                            href={`/dashboard/ingredients/${activity.ingredientId}`}
                            className="hover:text-primary"
                          >
                            {activity.ingredientName}
                          </Link>
                        </td>
                        <td>
                          {activity.quantity.toFixed(3)} {activity.unit}
                        </td>
                        <td className="text-sm text-base-content/70">
                          {activity.creatorName}
                        </td>
                        <td className="text-sm text-base-content/70">
                          {formatDistanceToNow(new Date(activity.createdAt), {
                            addSuffix: true,
                          })}
                        </td>
                      </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
