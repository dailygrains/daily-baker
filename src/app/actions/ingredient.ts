'use server';

import { db } from '@/lib/db';
import { getCurrentUser } from '@/lib/clerk';
import { revalidatePath } from 'next/cache';
import type { CreateIngredientInput, UpdateIngredientInput } from '@/lib/validations/ingredient';
import { actionContext, actionError, UNAUTHORIZED, type ActionResult } from '@/lib/services/action';
import * as ingredientService from '@/lib/services/ingredient';
import {
  getTotalQuantity,
  getWeightedAverageCost,
  type InventoryWithLots,
} from '@/lib/inventory';

/**
 * Helper to calculate inventory aggregates for an ingredient
 */
function calculateInventoryAggregates(inventory: {
  id: string;
  displayUnit: string;
  lowStockThreshold?: { toNumber: () => number } | number | null;
  lots: Array<{
    id: string;
    purchaseQty: { toNumber: () => number } | number;
    remainingQty: { toNumber: () => number } | number;
    purchaseUnit: string;
    costPerUnit: { toNumber: () => number } | number;
    purchasedAt: Date;
    expiresAt: Date | null;
    vendorId: string | null;
    notes: string | null;
  }>;
} | null): { currentQty: number; costPerUnit: number; lowStockThreshold: number | null } {
  if (!inventory || !inventory.lots.length) {
    const threshold = inventory?.lowStockThreshold != null
      ? (typeof inventory.lowStockThreshold === 'number' ? inventory.lowStockThreshold : inventory.lowStockThreshold.toNumber())
      : null;
    return { currentQty: 0, costPerUnit: 0, lowStockThreshold: threshold };
  }

  const inventoryForCalc: InventoryWithLots = {
    id: inventory.id,
    displayUnit: inventory.displayUnit,
    lots: inventory.lots.map((lot) => ({
      id: lot.id,
      purchaseQty: typeof lot.purchaseQty === 'number' ? lot.purchaseQty : lot.purchaseQty.toNumber(),
      remainingQty: typeof lot.remainingQty === 'number' ? lot.remainingQty : lot.remainingQty.toNumber(),
      purchaseUnit: lot.purchaseUnit,
      costPerUnit: typeof lot.costPerUnit === 'number' ? lot.costPerUnit : lot.costPerUnit.toNumber(),
      purchasedAt: lot.purchasedAt,
      expiresAt: lot.expiresAt,
      vendorId: lot.vendorId,
      notes: lot.notes,
    })),
  };

  const threshold = inventory.lowStockThreshold != null
    ? (typeof inventory.lowStockThreshold === 'number' ? inventory.lowStockThreshold : inventory.lowStockThreshold.toNumber())
    : null;

  return {
    currentQty: getTotalQuantity(inventoryForCalc),
    costPerUnit: getWeightedAverageCost(inventoryForCalc),
    lowStockThreshold: threshold,
  };
}

type Ingredient = Awaited<ReturnType<typeof ingredientService.createIngredient>>;
type UpdatedIngredient = Awaited<ReturnType<typeof ingredientService.updateIngredient>>;

export async function createIngredient(
  data: CreateIngredientInput
): Promise<ActionResult<Ingredient & { currentQty: number; costPerUnit: number; lowStockThreshold: null }>> {
  try {
    const ctx = await actionContext();
    if (!ctx) return UNAUTHORIZED;
    if (ctx.bakeryId !== data.bakeryId) {
      return { success: false, error: 'Unauthorized: You can only create ingredients for your bakery' };
    }

    const ingredient = await ingredientService.createIngredient(ctx, data);

    revalidatePath('/dashboard/ingredients');

    // Return with computed aggregates (0 for new ingredients)
    return {
      success: true,
      data: { ...ingredient, currentQty: 0, costPerUnit: 0, lowStockThreshold: null },
    };
  } catch (error) {
    return actionError(error, 'Failed to create ingredient');
  }
}

export async function updateIngredient(
  data: UpdateIngredientInput
): Promise<ActionResult<UpdatedIngredient & { currentQty: number; costPerUnit: number }>> {
  try {
    const ctx = await actionContext();
    if (!ctx) return UNAUTHORIZED;

    const ingredient = await ingredientService.updateIngredient(ctx, data.id, data);

    revalidatePath('/dashboard/ingredients');
    revalidatePath(`/dashboard/ingredients/${data.id}`);

    const aggregates = calculateInventoryAggregates(ingredient.inventory);

    return {
      success: true,
      data: {
        ...ingredient,
        currentQty: aggregates.currentQty,
        costPerUnit: aggregates.costPerUnit,
      },
    };
  } catch (error) {
    return actionError(error, 'Failed to update ingredient');
  }
}

export async function deleteIngredient(id: string): Promise<ActionResult> {
  try {
    const ctx = await actionContext();
    if (!ctx) return UNAUTHORIZED;

    await ingredientService.deleteIngredient(ctx, id);

    revalidatePath('/dashboard/ingredients');
    return { success: true };
  } catch (error) {
    return actionError(error, 'Failed to delete ingredient');
  }
}

export async function getIngredientsByBakery(bakeryId: string, search?: string) {
  try {
    const currentUser = await getCurrentUser();

    if (!currentUser) {
      return {
        success: false,
        error: 'Unauthorized',
      };
    }

    if (currentUser.bakeryId !== bakeryId && !currentUser.isPlatformAdmin) {
      return {
        success: false,
        error: 'Unauthorized: You can only view ingredients for your bakery',
      };
    }

    const ingredients = await db.ingredient.findMany({
      where: {
        bakeryId,
        ...(search && {
          name: { contains: search, mode: 'insensitive' },
        }),
      },
      include: {
        vendors: {
          include: {
            vendor: {
              select: {
                id: true,
                name: true,
              },
            },
          },
        },
        inventory: {
          include: {
            lots: true,
            _count: {
              select: {
                lots: true,
              },
            },
          },
        },
      },
      orderBy: {
        name: 'asc',
      },
    });

    // Fetch tags for all ingredients in one query
    const ingredientIds = ingredients.map(i => i.id);
    const entityTags = await db.entityTag.findMany({
      where: {
        entityType: 'ingredient',
        entityId: { in: ingredientIds },
      },
      include: {
        tag: {
          select: {
            id: true,
            name: true,
            color: true,
          },
        },
      },
    });

    // Group tags by ingredient ID
    const tagsByIngredient = entityTags.reduce((acc, et) => {
      if (!acc[et.entityId]) {
        acc[et.entityId] = [];
      }
      acc[et.entityId].push(et.tag);
      return acc;
    }, {} as Record<string, Array<{ id: string; name: string; color: string | null }>>);

    // Calculate aggregates from inventory for each ingredient
    return {
      success: true,
      data: ingredients.map(ingredient => {
        const aggregates = calculateInventoryAggregates(ingredient.inventory);
        return {
          ...ingredient,
          currentQty: aggregates.currentQty,
          costPerUnit: aggregates.costPerUnit,
          lowStockThreshold: aggregates.lowStockThreshold,
          tags: tagsByIngredient[ingredient.id] || [],
          _count: {
            lots: ingredient.inventory?._count?.lots ?? 0,
          },
        };
      }),
    };
  } catch (error) {
    console.error('Error fetching ingredients:', error);
    return {
      success: false,
      error: 'Failed to fetch ingredients',
    };
  }
}

export async function getIngredientById(id: string) {
  try {
    const currentUser = await getCurrentUser();

    if (!currentUser) {
      return {
        success: false,
        error: 'Unauthorized',
      };
    }

    const ingredient = await db.ingredient.findUnique({
      where: { id },
      include: {
        vendors: {
          include: {
            vendor: true,
          },
        },
        inventory: {
          include: {
            lots: {
              orderBy: {
                purchasedAt: 'asc',
              },
              include: {
                vendor: { select: { id: true, name: true } },
                usages: {
                  orderBy: { createdAt: 'desc' },
                  take: 5,
                  include: {
                    creator: { select: { id: true, name: true } },
                    productionSheet: { select: { id: true, description: true, recipes: { select: { recipe: { select: { name: true } } }, orderBy: { order: 'asc' } } } },
                  },
                },
              },
            },
          },
        },
        _count: {
          select: {
            recipeUses: true,
          },
        },
      },
    });

    if (!ingredient) {
      return {
        success: false,
        error: 'Ingredient not found',
      };
    }

    if (currentUser.bakeryId !== ingredient.bakeryId && !currentUser.isPlatformAdmin) {
      return {
        success: false,
        error: 'Unauthorized: You can only view ingredients for your bakery',
      };
    }

    // Fetch tags for this ingredient
    const entityTags = await db.entityTag.findMany({
      where: {
        entityType: 'ingredient',
        entityId: ingredient.id,
      },
      include: {
        tag: {
          include: {
            tagType: true,
          },
        },
      },
      orderBy: {
        tag: { name: 'asc' },
      },
    });

    const tags = entityTags.map(et => et.tag);

    // Calculate aggregates from inventory
    const aggregates = calculateInventoryAggregates(ingredient.inventory);

    // Serialize Decimal fields for client components
    return {
      success: true,
      data: {
        ...ingredient,
        currentQty: aggregates.currentQty,
        costPerUnit: aggregates.costPerUnit,
        lowStockThreshold: aggregates.lowStockThreshold,
        tags,
        inventory: ingredient.inventory ? {
          ...ingredient.inventory,
          lowStockThreshold: ingredient.inventory.lowStockThreshold ? Number(ingredient.inventory.lowStockThreshold) : null,
          lots: ingredient.inventory.lots.map(lot => ({
            ...lot,
            purchaseQty: Number(lot.purchaseQty),
            remainingQty: Number(lot.remainingQty),
            costPerUnit: Number(lot.costPerUnit),
            usages: lot.usages.map(u => ({
              ...u,
              quantity: Number(u.quantity),
            })),
          })),
        } : null,
      },
    };
  } catch (error) {
    console.error('Error fetching ingredient:', error);
    return {
      success: false,
      error: 'Failed to fetch ingredient',
    };
  }
}

export async function assignVendorToIngredient(
  ingredientId: string,
  vendorId: string
): Promise<ActionResult> {
  try {
    const ctx = await actionContext();
    if (!ctx) return UNAUTHORIZED;

    await ingredientService.assignVendorToIngredient(ctx, ingredientId, { vendorId });

    revalidatePath('/dashboard/ingredients');
    revalidatePath(`/dashboard/ingredients/${ingredientId}`);
    return { success: true };
  } catch (error) {
    return actionError(error, 'Failed to assign vendor');
  }
}

export async function unassignVendorFromIngredient(
  ingredientId: string,
  vendorId: string
): Promise<ActionResult> {
  try {
    const ctx = await actionContext();
    if (!ctx) return UNAUTHORIZED;

    await ingredientService.unassignVendorFromIngredient(ctx, ingredientId, vendorId);

    revalidatePath('/dashboard/ingredients');
    revalidatePath(`/dashboard/ingredients/${ingredientId}`);
    return { success: true };
  } catch (error) {
    return actionError(error, 'Failed to unassign vendor');
  }
}
