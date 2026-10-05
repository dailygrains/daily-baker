import { getCurrentUser } from '@/lib/clerk';
import { redirect } from 'next/navigation';
import { getProductById } from '@/app/actions/product';
import { ProductEditPageContent } from '@/components/product/ProductEditPageContent';
import { db } from '@/lib/db';

export default async function EditProductPage({
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

  const productResult = await getProductById(id);

  if (!productResult.success || !productResult.data) {
    redirect('/dashboard/products');
  }

  const raw = productResult.data;

  // Serialize all Decimal fields to numbers for client component
  const product = {
    id: raw.id,
    name: raw.name,
    description: raw.description,
    squareItemId: raw.squareItemId,
    recipeId: raw.recipeId,
    recipeScale: Number(raw.recipeScale),
    isActive: raw.isActive,
    variations: raw.variations.map((v) => ({
      id: v.id,
      name: v.name,
      sku: v.sku,
      squareVariationId: v.squareVariationId,
      unitWeightG: v.unitWeightG != null ? Number(v.unitWeightG) : null,
      batchYieldQty: v.batchYieldQty,
      laborCost: Number(v.laborCost),
      overheadCost: Number(v.overheadCost),
      retailPrice: v.retailPrice != null ? Number(v.retailPrice) : null,
      wholesalePrice: v.wholesalePrice != null ? Number(v.wholesalePrice) : null,
      targetMarginPct: v.targetMarginPct != null ? Number(v.targetMarginPct) : null,
      isActive: v.isActive,
      variationSupplies: v.variationSupplies.map((ps) => ({
        supply: {
          id: ps.supply.id,
          name: ps.supply.name,
          unit: ps.supply.unit,
          costPerUnit: Number(ps.supply.costPerUnit),
          category: ps.supply.category,
        },
        quantity: Number(ps.quantity),
        unit: ps.unit,
        wasteFactor: Number(ps.wasteFactor),
        costOverride: ps.costOverride != null ? Number(ps.costOverride) : null,
        notes: ps.notes,
      })),
    })),
  };

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
    <ProductEditPageContent
      bakeryId={user.bakeryId}
      product={product}
      recipes={recipes}
      supplies={supplies}
    />
  );
}
