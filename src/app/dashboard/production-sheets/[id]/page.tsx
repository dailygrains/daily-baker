import { getCurrentUser } from '@/lib/clerk';
import { redirect } from 'next/navigation';
import { SetPageHeader } from '@/components/layout/SetPageHeader';
import { getProductionSheetById } from '@/app/actions/productionSheet';
import Link from 'next/link';
import { Edit } from 'lucide-react';
import { CompleteProductionSheetButton } from '@/components/productionSheets/CompleteProductionSheetButton';
import { ProductionSheetDetailTabs } from '@/components/productionSheets/ProductionSheetDetailTabs';
import { ProductionSheetDetailContent } from '@/components/productionSheets/ProductionSheetDetailContent';
import {
  calculateAllScaledIngredients,
  aggregateIngredients,
  type ProductionSheetRecipeEntry,
} from '@/lib/ingredientAggregation';
import {
  isValidSnapshot,
  snapshotToScaledIngredients,
  snapshotToAggregatedIngredients,
  type ProductionSheetSnapshot,
} from '@/lib/productionSheetSnapshot';

export default async function ProductionSheetDetailPage({
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

  const productionSheetResult = await getProductionSheetById(id);

  if (!productionSheetResult.success || !productionSheetResult.data) {
    redirect('/dashboard/production-sheets');
  }

  const productionSheet = productionSheetResult.data;

  // For completed sheets with snapshot data, use frozen values
  // For pending sheets, calculate from live recipe data
  const snapshotData = productionSheet.snapshotData as ProductionSheetSnapshot | null;

  let scaledRecipes;
  let aggregatedIngredients;
  let totalCost;

  if (productionSheet.completed && snapshotData && isValidSnapshot(snapshotData)) {
    // Use frozen snapshot data for completed sheets
    scaledRecipes = snapshotToScaledIngredients(snapshotData);
    aggregatedIngredients = snapshotToAggregatedIngredients(snapshotData);
    totalCost = snapshotData.totalCost;
  } else {
    // Calculate from live recipe data for pending sheets (or completed sheets without snapshot)
    const recipeEntries: ProductionSheetRecipeEntry[] = productionSheet.recipes.map((r) => ({
      id: r.id,
      scale: Number(r.scale),
      order: r.order,
      recipe: {
        id: r.recipe.id,
        name: r.recipe.name,
        yieldQty: r.recipe.yieldQty,
        yieldUnit: r.recipe.yieldUnit,
        totalCost: r.recipe.totalCost,
        sections: r.recipe.sections.map((s) => ({
          id: s.id,
          name: s.name,
          order: s.order,
          ingredients: s.ingredients.map((i) => ({
            id: i.id,
            quantity: i.quantity,
            unit: i.unit,
            ingredient: i.ingredient,
          })),
        })),
      },
    }));

    scaledRecipes = calculateAllScaledIngredients(recipeEntries);
    aggregatedIngredients = aggregateIngredients(scaledRecipes);
    totalCost = scaledRecipes.reduce((sum, r) => sum + r.estimatedCost, 0);
  }

  // Get recipe names for display
  const recipeNames = productionSheet.recipes.map((r) => r.recipe.name).join(', ');

  // Prepare recipes for RecipeListTable - use snapshot data for completed sheets
  const recipesForTable =
    productionSheet.completed && snapshotData && isValidSnapshot(snapshotData)
      ? snapshotData.recipes.map((r, idx) => ({
          id: `snapshot-${idx}`,
          recipeId: r.recipeId,
          scale: r.scale,
          order: idx,
          recipe: {
            id: r.recipeId,
            name: r.recipeName,
            yieldQty: r.yieldQty,
            yieldUnit: r.yieldUnit,
            totalCost: r.totalCost / r.scale, // Convert back to per-recipe cost
          },
        }))
      : productionSheet.recipes.map((r) => ({
          id: r.id,
          recipeId: r.recipeId,
          scale: Number(r.scale),
          order: r.order,
          recipe: {
            id: r.recipe.id,
            name: r.recipe.name,
            yieldQty: r.recipe.yieldQty,
            yieldUnit: r.recipe.yieldUnit,
            totalCost: Number(r.recipe.totalCost || 0),
          },
        }));

  return (
    <>
      <SetPageHeader
        title={productionSheet.description || recipeNames}
        breadcrumbs={[
          { label: 'Production Sheets', href: '/dashboard/production-sheets' },
          { label: productionSheet.description || recipeNames },
        ]}
        actions={
          !productionSheet.completed && (
            <div className="flex gap-2">
              <Link
                href={`/dashboard/production-sheets/${id}/edit`}
                className="btn btn-primary"
              >
                <Edit className="h-4 w-4" />
                Edit
              </Link>
              <CompleteProductionSheetButton productionSheetId={id} />
            </div>
          )
        }
      />

      <ProductionSheetDetailTabs
        productionSheetId={productionSheet.id}
        bakeryId={productionSheet.bakeryId}
        detailsContent={
          <ProductionSheetDetailContent
            productionSheet={productionSheet}
            scaledRecipes={scaledRecipes}
            aggregatedIngredients={aggregatedIngredients}
            totalCost={totalCost}
            recipesForTable={recipesForTable}
          />
        }
      />
    </>
  );
}
