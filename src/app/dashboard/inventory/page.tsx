import { getCurrentUser } from '@/lib/clerk';
import { redirect } from 'next/navigation';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { PageHeader } from '@/components/ui/PageHeader';
import { getIngredientsByBakery } from '@/app/actions/ingredient';
import { getInventoryTransactionsByBakery } from '@/app/actions/inventoryTransaction';
import Link from 'next/link';
import { Package, TrendingUp, TrendingDown, AlertTriangle } from 'lucide-react';
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
  const transactionsResult = await getInventoryTransactionsByBakery(
    user.bakeryId,
    { limit: 10 }
  );

  if (!ingredientsResult.success) {
    return (
      <DashboardLayout isPlatformAdmin={user.isPlatformAdmin}>
        <div className="alert alert-error">
          <span>{ingredientsResult.error}</span>
        </div>
      </DashboardLayout>
    );
  }

  const ingredients = ingredientsResult.data;
  const transactions = transactionsResult.success
    ? transactionsResult.data
    : [];

  // Calculate stats
  const totalIngredients = ingredients.length;
  const lowStockCount = ingredients.filter(
    (ing) => Number(ing.currentQty) < (ing.minQty ? Number(ing.minQty) : 0)
  ).length;
  const totalValue = ingredients.reduce(
    (sum, ing) =>
      sum + Number(ing.currentQty) * Number(ing.costPerUnit),
    0
  );

  // Get transaction type badge class
  const getTransactionTypeBadgeClass = (type: string) => {
    switch (type) {
      case 'RECEIVE':
        return 'badge-success';
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

  // Get transaction type icon
  const getTransactionTypeIcon = (type: string) => {
    switch (type) {
      case 'RECEIVE':
        return <TrendingUp className="h-4 w-4" />;
      case 'USE':
      case 'WASTE':
        return <TrendingDown className="h-4 w-4" />;
      case 'ADJUST':
        return <Package className="h-4 w-4" />;
      default:
        return null;
    }
  };

  return (
    <DashboardLayout isPlatformAdmin={user.isPlatformAdmin}>
      <div className="space-y-6">
        <PageHeader
          title="Inventory Management"
          description="Track ingredient quantities and transactions"
        />

        {/* Stats */}
        <div className="stats stats-vertical lg:stats-horizontal shadow w-full">
          <div className="stat">
            <div className="stat-figure text-primary">
              <Package className="h-8 w-8" />
            </div>
            <div className="stat-title">Total Ingredients</div>
            <div className="stat-value text-primary">{totalIngredients}</div>
            <div className="stat-desc">
              <Link
                href="/dashboard/ingredients"
                className="link link-hover"
              >
                View all ingredients
              </Link>
            </div>
          </div>

          <div className="stat">
            <div className="stat-figure text-warning">
              <AlertTriangle className="h-8 w-8" />
            </div>
            <div className="stat-title">Low Stock Items</div>
            <div className="stat-value text-warning">{lowStockCount}</div>
            <div className="stat-desc">Below minimum quantity</div>
          </div>

          <div className="stat">
            <div className="stat-figure text-secondary">
              <span className="text-2xl">$</span>
            </div>
            <div className="stat-title">Total Inventory Value</div>
            <div className="stat-value text-secondary">
              ${totalValue.toFixed(2)}
            </div>
            <div className="stat-desc">Based on current quantities</div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Current Inventory Table */}
          <div className="card bg-base-100 shadow-xl lg:col-span-2">
            <div className="card-body">
              <div className="flex justify-between items-center mb-4">
                <h2 className="card-title">Current Inventory Levels</h2>
                <Link
                  href="/dashboard/ingredients"
                  className="btn btn-sm btn-ghost"
                >
                  Manage Ingredients
                </Link>
              </div>

              {ingredients.length === 0 ? (
                <div className="text-center py-12">
                  <Package className="h-16 w-16 mx-auto text-base-content/30 mb-4" />
                  <h3 className="text-lg font-semibold mb-2">
                    No ingredients yet
                  </h3>
                  <p className="text-base-content/70 mb-4">
                    Start by adding some ingredients to track
                  </p>
                  <Link
                    href="/dashboard/ingredients/new"
                    className="btn btn-primary"
                  >
                    Add Ingredient
                  </Link>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="table table-zebra">
                    <thead>
                      <tr>
                        <th>Ingredient</th>
                        <th>Current Quantity</th>
                        <th>Min Quantity</th>
                        <th>Value</th>
                        <th>Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {ingredients.map((ingredient) => {
                        const currentQty = Number(ingredient.currentQty);
                        const minQty = ingredient.minQty
                          ? Number(ingredient.minQty)
                          : 0;
                        const isLowStock = currentQty < minQty;
                        const value = currentQty * Number(ingredient.costPerUnit);

                        return (
                          <tr key={ingredient.id}>
                            <td>
                              <Link
                                href={`/dashboard/ingredients/${ingredient.id}`}
                                className="font-semibold hover:text-primary"
                              >
                                {ingredient.name}
                              </Link>
                            </td>
                            <td>
                              {currentQty.toFixed(3)} {ingredient.unit}
                            </td>
                            <td>
                              {minQty > 0 ? `${minQty.toFixed(3)} ${ingredient.unit}` : '-'}
                            </td>
                            <td>${value.toFixed(2)}</td>
                            <td>
                              {isLowStock ? (
                                <span className="badge badge-warning gap-2">
                                  <AlertTriangle className="h-3 w-3" />
                                  Low Stock
                                </span>
                              ) : (
                                <span className="badge badge-success">OK</span>
                              )}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>

          {/* Recent Transactions */}
          <div className="card bg-base-100 shadow-xl lg:col-span-2">
            <div className="card-body">
              <div className="flex justify-between items-center mb-4">
                <h2 className="card-title">Recent Transactions</h2>
                <Link
                  href="/dashboard/inventory/transactions"
                  className="btn btn-sm btn-ghost"
                >
                  View All
                </Link>
              </div>

              {transactions.length === 0 ? (
                <div className="text-center py-8">
                  <TrendingUp className="h-12 w-12 mx-auto text-base-content/30 mb-2" />
                  <p className="text-base-content/70">
                    No transactions yet
                  </p>
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
                      {transactions.map((transaction) => (
                        <tr key={transaction.id}>
                          <td>
                            <span
                              className={`badge ${getTransactionTypeBadgeClass(transaction.type)} gap-2`}
                            >
                              {getTransactionTypeIcon(transaction.type)}
                              {transaction.type}
                            </span>
                          </td>
                          <td>
                            <Link
                              href={`/dashboard/ingredients/${transaction.ingredientId}`}
                              className="hover:text-primary"
                            >
                              {transaction.ingredient.name}
                            </Link>
                          </td>
                          <td>
                            {Number(transaction.quantity).toFixed(3)}{' '}
                            {transaction.unit}
                          </td>
                          <td className="text-sm text-base-content/70">
                            {transaction.user.name || transaction.user.email}
                          </td>
                          <td className="text-sm text-base-content/70">
                            {formatDistanceToNow(new Date(transaction.createdAt), {
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
    </DashboardLayout>
  );
}
