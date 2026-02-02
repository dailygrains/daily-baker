import { getCurrentUser } from '@/lib/clerk';
import { redirect } from 'next/navigation';
import { SetPageHeader } from '@/components/layout/SetPageHeader';
import { getIngredientsByBakery } from '@/app/actions/ingredient';
import { getRecentInventoryActivity } from '@/app/actions/inventory';
import { InventoryTable } from '@/components/inventory/InventoryTable';
import Link from 'next/link';
import { Package, TrendingUp, TrendingDown, AlertTriangle, Boxes, Plus } from 'lucide-react';
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
          <Link href="/dashboard/inventory/lots/new" className="btn btn-primary btn-sm">
            <Plus className="h-4 w-4" />
            Add Inventory Lot
          </Link>
        }
      />

      {/* Stats */}
      <div className="stats stats-vertical lg:stats-horizontal shadow w-full">
        <div className="stat">
          <div className="stat-figure text-primary">
            <Package className="h-8 w-8" />
          </div>
          <div className="stat-title">Total Ingredients</div>
          <div className="stat-value text-primary">{totalIngredients}</div>
          <div className="stat-desc">{ingredientsWithInventory} with inventory</div>
        </div>

        <div className="stat">
          <div className="stat-figure text-info">
            <Boxes className="h-8 w-8" />
          </div>
          <div className="stat-title">Inventory Lots</div>
          <div className="stat-value text-info">{totalLots}</div>
          <div className="stat-desc">Active purchase lots</div>
        </div>

        <div className="stat">
          <div className="stat-figure text-secondary">
            <span className="text-2xl">$</span>
          </div>
          <div className="stat-title">Total Inventory Value</div>
          <div className="stat-value text-secondary">${totalValue.toFixed(2)}</div>
          <div className="stat-desc">Based on weighted average cost</div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Current Inventory Table */}
        <div className="card bg-base-100 shadow-xl lg:col-span-2">
          <div className="card-body">
            <div className="flex justify-between items-center mb-4">
              <h2 className="card-title">Current Inventory Levels</h2>
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
          </div>
        </div>

        {/* Recent Activity */}
        <div className="card bg-base-100 shadow-xl lg:col-span-2">
          <div className="card-body">
            <div className="flex justify-between items-center mb-4">
              <h2 className="card-title">Recent Inventory Activity</h2>
            </div>

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
          </div>
        </div>
      </div>
    </div>
  );
}
