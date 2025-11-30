import { getCurrentUser } from '@/lib/clerk';
import { redirect } from 'next/navigation';
import { IngredientNewPageContent } from '@/components/ingredients/IngredientNewPageContent';

export default async function NewIngredientPage() {
  const user = await getCurrentUser();

  if (!user) {
    redirect('/sign-in');
  }

  if (!user.bakeryId) {
    redirect('/dashboard');
  }

  return (
    <IngredientNewPageContent
      bakeryId={user.bakeryId}
    />
  );
}
