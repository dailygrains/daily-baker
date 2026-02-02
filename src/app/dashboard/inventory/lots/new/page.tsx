import { getCurrentUser } from '@/lib/clerk';
import { redirect } from 'next/navigation';
import { getIngredientsByBakery } from '@/app/actions/ingredient';
import { getVendorsByBakery } from '@/app/actions/vendor';
import { AddLotPageContent } from '@/components/inventory/AddLotPageContent';

export default async function NewInventoryLotPage({
  searchParams,
}: {
  searchParams: Promise<{ ingredientId?: string }>;
}) {
  const user = await getCurrentUser();
  const { ingredientId } = await searchParams;

  if (!user) {
    redirect('/sign-in');
  }

  if (!user.bakeryId) {
    redirect('/dashboard');
  }

  const [ingredientsResult, vendorsResult] = await Promise.all([
    getIngredientsByBakery(user.bakeryId),
    getVendorsByBakery(user.bakeryId),
  ]);

  const ingredients = ingredientsResult.success ? ingredientsResult.data || [] : [];
  const vendors = vendorsResult.success ? vendorsResult.data || [] : [];

  // Serialize for client component
  const serializedIngredients = ingredients.map((i) => ({
    id: i.id,
    name: i.name,
    unit: i.unit,
  }));

  const serializedVendors = vendors.map((v) => ({
    id: v.id,
    name: v.name,
  }));

  return (
    <AddLotPageContent
      ingredients={serializedIngredients}
      vendors={serializedVendors}
      preselectedIngredientId={ingredientId}
    />
  );
}
