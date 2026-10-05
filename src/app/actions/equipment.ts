'use server';

import { db } from '@/lib/db';
import { getCurrentUser } from '@/lib/clerk';
import type { CreateEquipmentInput, UpdateEquipmentInput } from '@/lib/validations/equipment';
import { revalidatePath } from 'next/cache';
import { actionContext, actionError, UNAUTHORIZED, type ActionResult } from '@/lib/services/action';
import * as equipmentService from '@/lib/services/equipment';

type EquipmentResult = ActionResult<Awaited<ReturnType<typeof equipmentService.createEquipment>>>;

/**
 * Create new equipment
 */
export async function createEquipment(data: CreateEquipmentInput): Promise<EquipmentResult> {
  try {
    const ctx = await actionContext();
    if (!ctx) return UNAUTHORIZED;
    if (ctx.bakeryId !== data.bakeryId) {
      return { success: false, error: 'Unauthorized: You can only create equipment for your bakery' };
    }

    const equipment = await equipmentService.createEquipment(ctx, data);

    revalidatePath('/dashboard/equipment');
    return { success: true, data: equipment };
  } catch (error) {
    return actionError(error, 'Failed to create equipment');
  }
}

/**
 * Update existing equipment
 */
export async function updateEquipment(data: UpdateEquipmentInput): Promise<EquipmentResult> {
  try {
    const ctx = await actionContext();
    if (!ctx) return UNAUTHORIZED;

    const equipment = await equipmentService.updateEquipment(ctx, data.id, data);

    revalidatePath('/dashboard/equipment');
    revalidatePath(`/dashboard/equipment/${equipment.id}`);
    return { success: true, data: equipment };
  } catch (error) {
    return actionError(error, 'Failed to update equipment');
  }
}

/**
 * Delete equipment
 */
export async function deleteEquipment(id: string): Promise<ActionResult> {
  try {
    const ctx = await actionContext();
    if (!ctx) return UNAUTHORIZED;

    await equipmentService.deleteEquipment(ctx, id);

    revalidatePath('/dashboard/equipment');
    return { success: true };
  } catch (error) {
    return actionError(error, 'Failed to delete equipment');
  }
}

/**
 * Get all equipment for a bakery
 */
export async function getEquipmentByBakery(bakeryId: string) {
  try {
    const currentUser = await getCurrentUser();

    if (!currentUser) {
      return { success: false, error: 'Unauthorized: You must be logged in' };
    }

    // Verify user belongs to the bakery
    if (currentUser.bakeryId !== bakeryId) {
      return {
        success: false,
        error: 'Unauthorized: You can only view equipment for your bakery',
      };
    }

    const equipment = await db.equipment.findMany({
      where: { bakeryId },
      include: {
        vendor: {
          select: {
            id: true,
            name: true,
          },
        },
      },
      orderBy: {
        name: 'asc',
      },
    });

    return { success: true, data: equipment };
  } catch (error) {
    console.error('Failed to fetch equipment:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to fetch equipment',
    };
  }
}

/**
 * Get a single equipment item by ID
 */
export async function getEquipmentById(id: string) {
  try {
    const currentUser = await getCurrentUser();

    if (!currentUser) {
      return { success: false, error: 'Unauthorized: You must be logged in' };
    }

    const equipment = await db.equipment.findUnique({
      where: { id },
      include: {
        vendor: {
          select: {
            id: true,
            name: true,
            email: true,
            phone: true,
          },
        },
      },
    });

    if (!equipment) {
      return { success: false, error: 'Equipment not found' };
    }

    // Verify user belongs to the same bakery
    if (currentUser.bakeryId !== equipment.bakeryId) {
      return {
        success: false,
        error: 'Unauthorized: You can only view equipment for your bakery',
      };
    }

    return { success: true, data: equipment };
  } catch (error) {
    console.error('Failed to fetch equipment:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to fetch equipment',
    };
  }
}
