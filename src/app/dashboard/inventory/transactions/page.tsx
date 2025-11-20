import { getCurrentUser } from '@/lib/clerk';
import { redirect } from 'next/navigation';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { PageHeader } from '@/components/ui/PageHeader';
import { getInventoryTransactionsByBakery } from '@/app/actions/inventoryTransaction';
import Link from 'next/link';
import { TrendingUp, TrendingDown, Package, Plus } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';

export default async function InventoryTransactionsPage() {
  const user = await getCurrentUser();

  if (!user) {
    redirect('/sign-in');
  }

  if (!user.bakeryId) {
    redirect('/dashboard');
  }

  const transactionsResult = await getInventoryTransactionsByBakery(
    user.bakeryId,
    { limit: 100 }
  );

  if (!transactionsResult.success) {
    return (
      <DashboardLayout isPlatformAdmin={user.isPlatformAdmin}>
        <div className="alert alert-error">
          <span>{transactionsResult.error}</span>
        </div>
      </DashboardLayout>
    );
  }

  const transactions = transactionsResult.data;

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
          title="Inventory Transactions"
          description="Complete history of all inventory transactions"
          action={
            <Link
              href="/dashboard/inventory/transactions/new"
              className="btn btn-primary btn-sm"
            >
              <Plus className="h-4 w-4" />
              New Transaction
            </Link>
          }
        />

        <div className="card bg-base-100 shadow-xl">
          <div className="card-body">
            {transactions.length === 0 ? (
              <div className="text-center py-12">
                <Package className="h-16 w-16 mx-auto text-base-content/30 mb-4" />
                <h3 className="text-lg font-semibold mb-2">
                  No transactions yet
                </h3>
                <p className="text-base-content/70 mb-4">
                  Start tracking inventory by creating transactions
                </p>
                <Link
                  href="/dashboard/inventory/transactions/new"
                  className="btn btn-primary"
                >
                  <Plus className="h-4 w-4" />
                  Create Transaction
                </Link>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="table">
                  <thead>
                    <tr>
                      <th>Type</th>
                      <th>Ingredient</th>
                      <th>Quantity</th>
                      <th>Notes</th>
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
                            className="font-semibold hover:text-primary"
                          >
                            {transaction.ingredient.name}
                          </Link>
                        </td>
                        <td className="font-mono">
                          {Number(transaction.quantity).toFixed(3)}{' '}
                          {transaction.unit}
                        </td>
                        <td className="max-w-xs truncate text-sm text-base-content/70">
                          {transaction.notes || '-'}
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
    </DashboardLayout>
  );
}
