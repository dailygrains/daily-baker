import { getCurrentUser } from '@/lib/clerk';
import { redirect } from 'next/navigation';
import { PageHeader } from '@/components/ui/PageHeader';
import { EmptyState } from '@/components/ui/EmptyState';
import { getIngredientsByBakery } from '@/app/actions/ingredient';
import { IngredientsTable } from '@/components/ingredients/IngredientsTable';
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

  // Serialize Decimal values for client component
  const serializedIngredients = ingredients.map(ingredient => ({
    ...ingredient,
    currentQty: ingredient.currentQty.toString(),
    costPerUnit: ingredient.costPerUnit.toString(),
  }));

  return (
    <>
      <PageHeader
        title="Ingredients"
        sticky
        actions={
          <Link href="/dashboard/ingredients/new" className="btn btn-primary">
            <Plus className="h-5 w-5 mr-2" />
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
              <Plus className="h-5 w-5 mr-2" />
              Add First Ingredient
            </Link>
          }
        />
      ) : (
        <>
          <div className="stats shadow w-full">
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

          <IngredientsTable ingredients={serializedIngredients} />
        </>
      )}
    </>
  );
}
