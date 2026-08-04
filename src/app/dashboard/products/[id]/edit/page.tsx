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
    sku: raw.sku,
    description: raw.description,
    recipeId: raw.recipeId,
    recipeScale: Number(raw.recipeScale),
    batchYieldQty: raw.batchYieldQty,
    laborCost: Number(raw.laborCost),
    overheadCost: Number(raw.overheadCost),
    retailPrice: raw.retailPrice ? Number(raw.retailPrice) : null,
    wholesalePrice: raw.wholesalePrice ? Number(raw.wholesalePrice) : null,
    targetMarginPct: raw.targetMarginPct ? Number(raw.targetMarginPct) : null,
    productSupplies: raw.productSupplies.map((ps) => ({
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
      costOverride: ps.costOverride ? Number(ps.costOverride) : null,
      notes: ps.notes,
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
