import { getCurrentUser } from '@/lib/clerk';
import { redirect } from 'next/navigation';
import { PageHeader } from '@/components/ui/PageHeader';
import { getIngredientById } from '@/app/actions/ingredient';
import Link from 'next/link';
import { Edit, Package, TrendingUp, DollarSign } from 'lucide-react';
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
  const currentQty = Number(ingredient.currentQty);
  const costPerUnit = Number(ingredient.costPerUnit);
  const totalValue = currentQty * costPerUnit;
  const isLowStock = currentQty < 100;

  return (
    
      <>
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
                  <p className="text-sm text-base-content/70">Current Quantity</p>
                  <p className={`text-2xl font-bold ${isLowStock ? 'text-warning' : ''}`}>
                    {currentQty.toFixed(3)} {ingredient.unit}
                  </p>
                  {isLowStock && <p className="text-sm text-warning mt-1">Low stock</p>}
                </div>

                <div>
                  <p className="text-sm text-base-content/70">Cost per Unit</p>
                  <p className="text-2xl font-bold">${costPerUnit.toFixed(2)}</p>
                  <p className="text-sm text-base-content/70 mt-1">per {ingredient.unit}</p>
                </div>

                <div>
                  <p className="text-sm text-base-content/70">Total Value</p>
                  <p className="text-2xl font-bold text-success">${totalValue.toFixed(2)}</p>
                </div>

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
                <div className="stat-title">Current Stock</div>
                <div className="stat-value text-primary">{currentQty.toFixed(1)}</div>
                <div className="stat-desc">{ingredient.unit}</div>
              </div>

              <div className="stat">
                <div className="stat-figure text-secondary">
                  <DollarSign className="h-8 w-8" />
                </div>
                <div className="stat-title">Total Value</div>
                <div className="stat-value text-secondary">${totalValue.toFixed(2)}</div>
                <div className="stat-desc">At current prices</div>
              </div>

              <div className="stat">
                <div className="stat-figure text-accent">
                  <TrendingUp className="h-8 w-8" />
                </div>
                <div className="stat-title">Transactions</div>
                <div className="stat-value text-accent">{ingredient.transactions.length}</div>
                <div className="stat-desc">Recent activity</div>
              </div>
            </div>
          </div>
        </div>

        {/* Recent Transactions */}
        {ingredient.transactions.length > 0 && (
          <div>
            <h2 className="text-xl font-semibold mb-4">Recent Transactions</h2>
            <div className="overflow-x-auto">
              <table className="table table-zebra">
                <thead>
                  <tr>
                    <th>Date</th>
                    <th>Type</th>
                    <th>Quantity</th>
                    <th>Notes</th>
                  </tr>
                </thead>
                <tbody>
                  {ingredient.transactions.map((transaction) => (
                    <tr key={transaction.id}>
                      <td className="align-top">
                        {formatDistanceToNow(new Date(transaction.createdAt), {
                          addSuffix: true,
                        })}
                      </td>
                      <td className="align-top">
                        <span
                          className={`badge ${
                            transaction.type === 'RECEIVE'
                              ? 'badge-success'
                              : transaction.type === 'USE'
                                ? 'badge-info'
                                : transaction.type === 'ADJUST'
                                  ? 'badge-warning'
                                  : 'badge-error'
                          }`}
                        >
                          {transaction.type}
                        </span>
                      </td>
                      <td className="align-top">
                        {Number(transaction.quantity).toFixed(3)} {transaction.unit}
                      </td>
                      <td className="align-top">{transaction.notes || '-'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </>
  );
}
