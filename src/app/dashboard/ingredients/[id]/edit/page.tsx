import { getCurrentUser } from '@/lib/clerk';
import { redirect } from 'next/navigation';
import { IngredientEditPageContent } from '@/components/ingredients/IngredientEditPageContent';
import { getIngredientById } from '@/app/actions/ingredient';

export default async function EditIngredientPage({
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

  // Calculate lot count from inventory
  const lotCount = ingredient.inventory?.lots?.length ?? 0;

  // Serialize Decimal values for client component
  const serializedIngredient = {
    ...ingredient,
    currentQty: ingredient.currentQty.toString(),
    costPerUnit: ingredient.costPerUnit.toString(),
    lowStockThreshold: ingredient.lowStockThreshold ?? null,
    _count: {
      recipeUses: ingredient._count?.recipeUses ?? 0,
      lots: lotCount,
    },
  };

  return (
    <IngredientEditPageContent
      bakeryId={user.bakeryId}
      ingredient={serializedIngredient}
    />
  );
}
