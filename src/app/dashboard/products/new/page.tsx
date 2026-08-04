import { getCurrentUser } from '@/lib/clerk';
import { redirect } from 'next/navigation';
import { SetPageHeader } from '@/components/layout/SetPageHeader';
import { ProductForm } from '@/components/product/ProductForm';
import { db } from '@/lib/db';

export default async function NewProductPage() {
  const user = await getCurrentUser();

  if (!user) {
    redirect('/sign-in');
  }

  if (!user.bakeryId) {
    redirect('/dashboard');
  }

  // Fetch recipes for the dropdown
  const rawRecipes = await db.recipe.findMany({
    where: { bakeryId: user.bakeryId },
    select: {
      id: true,
      name: true,
      totalCost: true,
    },
    orderBy: { name: 'asc' },
  });

  const recipes = rawRecipes.map((r) => ({
    id: r.id,
    name: r.name,
    totalCost: Number(r.totalCost),
  }));

  // Fetch active supplies for the BOM line items
  const rawSupplies = await db.supply.findMany({
    where: { bakeryId: user.bakeryId, isActive: true },
    select: {
      id: true,
      name: true,
      unit: true,
      costPerUnit: true,
      category: true,
    },
    orderBy: { name: 'asc' },
  });

  const supplies = rawSupplies.map((s) => ({
    id: s.id,
    name: s.name,
    unit: s.unit,
    costPerUnit: Number(s.costPerUnit),
    category: s.category,
  }));

  return (
    <div className="space-y-6">
      <SetPageHeader
        title="Add New Product"
        description="Create a sellable product with recipe and supply costs"
      />

      <div className="card bg-base-100 shadow-xl">
        <div className="card-body">
          <ProductForm
            bakeryId={user.bakeryId}
            recipes={recipes}
            supplies={supplies}
          />
        </div>
      </div>
    </div>
  );
}
