'use server';

import { db } from '@/lib/db';
import { getCurrentUser } from '@/lib/clerk';
import type { CreateSupplyInput, UpdateSupplyInput } from '@/lib/validations/supply';
import { revalidatePath } from 'next/cache';
import { actionContext, actionError, UNAUTHORIZED, type ActionResult } from '@/lib/services/action';
import * as supplyService from '@/lib/services/supply';

type SupplyResult = ActionResult<Awaited<ReturnType<typeof supplyService.createSupply>>>;

export async function createSupply(data: CreateSupplyInput): Promise<SupplyResult> {
  try {
    const ctx = await actionContext();
    if (!ctx) return UNAUTHORIZED;
    if (ctx.bakeryId !== data.bakeryId) {
      return { success: false, error: 'Unauthorized: You can only create supplies for your bakery' };
    }

    const supply = await supplyService.createSupply(ctx, data);

    revalidatePath('/dashboard/supplies');
    return { success: true, data: supply };
  } catch (error) {
    return actionError(error, 'Failed to create supply');
  }
}

export async function updateSupply(data: UpdateSupplyInput): Promise<SupplyResult> {
  try {
    const ctx = await actionContext();
    if (!ctx) return UNAUTHORIZED;

    const supply = await supplyService.updateSupply(ctx, data.id, data);

    revalidatePath('/dashboard/supplies');
    revalidatePath(`/dashboard/supplies/${supply.id}`);
    return { success: true, data: supply };
  } catch (error) {
    return actionError(error, 'Failed to update supply');
  }
}

export async function deleteSupply(id: string): Promise<ActionResult> {
  try {
    const ctx = await actionContext();
    if (!ctx) return UNAUTHORIZED;

    await supplyService.deleteSupply(ctx, id);

    revalidatePath('/dashboard/supplies');
    return { success: true };
  } catch (error) {
    return actionError(error, 'Failed to delete supply');
  }
}

export async function getSuppliesByBakery(bakeryId: string) {
  try {
    const currentUser = await getCurrentUser();
    if (!currentUser) {
      return { success: false, error: 'Unauthorized: You must be logged in' };
    }
    if (currentUser.bakeryId !== bakeryId) {
      return { success: false, error: 'Unauthorized: You can only view supplies for your bakery' };
    }

    const supplies = await db.supply.findMany({
      where: { bakeryId },
      include: {
        vendors: {
          include: {
            vendor: { select: { id: true, name: true } },
          },
        },
        _count: { select: { productSupplies: true } },
      },
      orderBy: { name: 'asc' },
    });

    return { success: true, data: supplies };
  } catch (error) {
    console.error('Failed to fetch supplies:', error);
    return { success: false, error: error instanceof Error ? error.message : 'Failed to fetch supplies' };
  }
}

export async function getSupplyById(id: string) {
  try {
    const currentUser = await getCurrentUser();
    if (!currentUser) {
      return { success: false, error: 'Unauthorized: You must be logged in' };
    }

    const supply = await db.supply.findUnique({
      where: { id },
      include: {
        vendors: {
          include: {
            vendor: { select: { id: true, name: true, email: true, phone: true } },
          },
        },
        productSupplies: {
          include: {
            variation: {
              select: {
                id: true,
                name: true,
                product: { select: { id: true, name: true } },
              },
            },
          },
        },
      },
    });

    if (!supply) {
      return { success: false, error: 'Supply not found' };
    }
    if (currentUser.bakeryId !== supply.bakeryId) {
      return { success: false, error: 'Unauthorized: You can only view supplies for your bakery' };
    }

    return { success: true, data: supply };
  } catch (error) {
    console.error('Failed to fetch supply:', error);
    return { success: false, error: error instanceof Error ? error.message : 'Failed to fetch supply' };
  }
}
