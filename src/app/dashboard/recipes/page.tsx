import { getCurrentUser } from '@/lib/clerk';
import { redirect } from 'next/navigation';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { PageHeader } from '@/components/ui/PageHeader';
import { getRecipesByBakery } from '@/app/actions/recipe';
import Link from 'next/link';
import { Plus, Layers, ClipboardList } from 'lucide-react';

export default async function RecipesPage() {
  const user = await getCurrentUser();

  if (!user) {
    redirect('/sign-in');
  }

  if (!user.bakeryId) {
    redirect('/dashboard');
  }

  const recipesResult = await getRecipesByBakery(user.bakeryId);

  if (!recipesResult.success) {
    return (
      <DashboardLayout
        isPlatformAdmin={user.isPlatformAdmin}
        bakeries={user.allBakeries}
        currentBakeryId={user.bakeryId}
      >
        <div className="alert alert-error">
          <span>{recipesResult.error}</span>
        </div>
      </DashboardLayout>
    );
  }

  const recipes = recipesResult.data || [];
  const totalRecipes = recipes.length;
  const totalCost = recipes.reduce((sum, r) => sum + Number(r.totalCost), 0).toFixed(2);
  const avgCost = totalRecipes > 0 ? (Number(totalCost) / totalRecipes).toFixed(2) : '0.00';

  return (
    <DashboardLayout
      isPlatformAdmin={user.isPlatformAdmin}
      bakeries={user.allBakeries}
      currentBakeryId={user.bakeryId}
    >
      <div className="space-y-6">
        <PageHeader
          title="Recipes"
          description="Manage your bakery recipes and costing"
          actions={
            <Link href="/dashboard/recipes/new" className="btn btn-primary">
              <Plus className="h-4 w-4" />
              Add Recipe
            </Link>
          }
        />

        {/* Stats */}
        <div className="stats stats-horizontal shadow w-full">
          <div className="stat">
            <div className="stat-title">Total Recipes</div>
            <div className="stat-value text-primary">{totalRecipes}</div>
            <div className="stat-desc">Active recipes</div>
          </div>

          <div className="stat">
            <div className="stat-title">Total Cost</div>
            <div className="stat-value text-secondary">${totalCost}</div>
            <div className="stat-desc">Combined ingredient cost</div>
          </div>

          <div className="stat">
            <div className="stat-title">Average Cost</div>
            <div className="stat-value text-accent">${avgCost}</div>
            <div className="stat-desc">Per recipe</div>
          </div>
        </div>

        {/* Recipes List */}
        {recipes.length === 0 ? (
          <div className="card bg-base-100 shadow-xl">
            <div className="card-body text-center py-12">
              <h3 className="text-2xl font-bold mb-2">No recipes yet</h3>
              <p className="text-base-content/70 mb-6">
                Get started by adding your first recipe
              </p>
              <div>
                <Link href="/dashboard/recipes/new" className="btn btn-primary">
                  <Plus className="h-4 w-4" />
                  Add Your First Recipe
                </Link>
              </div>
            </div>
          </div>
        ) : (
          <div className="card bg-base-100 shadow-xl">
            <div className="card-body">
              <div className="overflow-x-auto">
                <table className="table table-zebra">
                  <thead>
                    <tr>
                      <th>Recipe Name</th>
                      <th>Yield</th>
                      <th>Sections</th>
                      <th>Total Cost</th>
                      <th>Cost per Unit</th>
                      <th>Bake Sheets</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {recipes.map((recipe) => {
                      const yieldMatch = recipe.yield.match(/(\d+)/);
                      const yieldNum = yieldMatch ? parseInt(yieldMatch[1]) : 1;
                      const costPerUnit = yieldNum > 0 ? (Number(recipe.totalCost) / yieldNum).toFixed(2) : '0.00';

                      return (
                        <tr key={recipe.id}>
                          <td>
                            <Link
                              href={`/dashboard/recipes/${recipe.id}`}
                              className="font-semibold hover:text-primary"
                            >
                              {recipe.name}
                            </Link>
                            {recipe.description && (
                              <p className="text-sm text-base-content/70 truncate max-w-xs">
                                {recipe.description}
                              </p>
                            )}
                          </td>
                          <td>{recipe.yield}</td>
                          <td>
                            <span className="badge badge-info gap-1">
                              <Layers className="h-3 w-3" />
                              {recipe._count.sections}
                            </span>
                          </td>
                          <td>
                            <span className="font-semibold text-success">
                              ${Number(recipe.totalCost).toFixed(2)}
                            </span>
                          </td>
                          <td>
                            <span className="text-sm">
                              ${costPerUnit}
                            </span>
                          </td>
                          <td>
                            {recipe._count.bakeSheets > 0 ? (
                              <span className="badge badge-secondary gap-1">
                                <ClipboardList className="h-3 w-3" />
                                {recipe._count.bakeSheets}
                              </span>
                            ) : (
                              <span className="text-base-content/50">None</span>
                            )}
                          </td>
                          <td>
                            <Link
                              href={`/dashboard/recipes/${recipe.id}/edit`}
                              className="btn btn-ghost btn-xs"
                            >
                              Edit
                            </Link>
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
      </div>
    </DashboardLayout>
  );
}
