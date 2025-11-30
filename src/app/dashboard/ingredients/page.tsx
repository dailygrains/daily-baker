import { getCurrentUser } from '@/lib/clerk';
import { redirect } from 'next/navigation';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
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

  return (
    <DashboardLayout
      isPlatformAdmin={user.isPlatformAdmin}
      bakeries={user.allBakeries}
      currentBakeryId={user.bakeryId}
    >
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
        <div className="space-y-6">
          <IngredientsTable ingredients={ingredients} />

          <div className="stats shadow w-full">
            <div className="stat">
              <div className="stat-figure text-primary">
                <Package className="h-8 w-8" />
              </div>
              <div className="stat-title">Total Ingredients</div>
              <div className="stat-value text-primary">{ingredients.length}</div>
            </div>

            <div className="stat">
              <div className="stat-title">With Vendors</div>
              <div className="stat-value text-secondary">
                {ingredients.filter((i) => i.vendors.length > 0).length}
              </div>
            </div>

            <div className="stat">
              <div className="stat-title">Total Inventory Batches</div>
              <div className="stat-value text-accent">
                {ingredients.reduce((sum, i) => sum + (i._count?.inventoryItems ?? 0), 0)}
              </div>
            </div>
          </div>
        </div>
      )}
    </DashboardLayout>
  );
}
