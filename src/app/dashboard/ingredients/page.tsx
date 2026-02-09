import { getCurrentUser } from '@/lib/clerk';
import { redirect } from 'next/navigation';
import { SetPageHeader } from '@/components/layout/SetPageHeader';
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

  // Serialize only needed fields for client component (avoid passing Decimal objects)
  const serializedIngredients = ingredients.map(ingredient => ({
    id: ingredient.id,
    name: ingredient.name,
    unit: ingredient.unit,
    currentQty: ingredient.currentQty.toString(),
    costPerUnit: ingredient.costPerUnit.toString(),
    lowStockThreshold: ingredient.lowStockThreshold ?? null,
    vendors: ingredient.vendors,
    tags: ingredient.tags,
  }));

  return (
    <>
      <SetPageHeader
        title="Ingredients"
        description="Manage your bakery ingredients and track costs"
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
        <div className="space-y-6">
          <div className="card bg-base-100 p-4">
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
              <div>
                <p className="text-sm text-base-content/70">Total Ingredients</p>
                <p className="text-2xl font-bold text-primary">{ingredients.length}</p>
              </div>
              <div>
                <p className="text-sm text-base-content/70">Low Stock Items</p>
                <p className="text-2xl font-bold text-warning">
                  {ingredients.filter((i) => {
                    const threshold = i.lowStockThreshold;
                    return threshold != null && threshold > 0 && Number(i.currentQty) < threshold;
                  }).length}
                </p>
              </div>
              <div>
                <p className="text-sm text-base-content/70">Total Inventory Value</p>
                <p className="text-2xl font-bold text-success">
                  $
                  {ingredients
                    .reduce(
                      (sum, i) => sum + Number(i.currentQty) * Number(i.costPerUnit),
                      0
                    )
                    .toFixed(2)}
                </p>
              </div>
            </div>
          </div>

          <IngredientsTable ingredients={serializedIngredients} />
        </div>
      )}
    </>
  );
}
