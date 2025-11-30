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

  return (
    <IngredientEditPageContent
      bakeryId={user.bakeryId}
      ingredient={ingredient}
      isPlatformAdmin={user.isPlatformAdmin}
      bakeries={user.allBakeries}
      currentBakeryId={user.bakeryId}
    />
  );
}
