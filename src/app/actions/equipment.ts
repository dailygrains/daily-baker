'use server';

import { db } from '@/lib/db';
import { getCurrentUser } from '@/lib/clerk';
import { createActivityLog } from './activity';
import {
  createEquipmentSchema,
  updateEquipmentSchema,
  type CreateEquipmentInput,
  type UpdateEquipmentInput,
} from '@/lib/validations/equipment';
import { revalidatePath } from 'next/cache';
import { Decimal } from '@prisma/client/runtime/library';

/**
 * Create new equipment
 */
export async function createEquipment(data: CreateEquipmentInput) {
  try {
    const currentUser = await getCurrentUser();

    if (!currentUser) {
      return { success: false, error: 'Unauthorized: You must be logged in' };
    }

    // Verify user belongs to the bakery
    if (currentUser.bakeryId !== data.bakeryId) {
      return {
        success: false,
        error: 'Unauthorized: You can only create equipment for your bakery',
      };
    }

    // Validate input
    const validatedData = createEquipmentSchema.parse(data);

    // Create equipment
    const equipment = await db.equipment.create({
      data: {
        bakeryId: validatedData.bakeryId,
        name: validatedData.name,
        status: validatedData.status,
        vendorId: validatedData.vendorId || null,
        purchaseDate: validatedData.purchaseDate || null,
        cost: validatedData.cost ? new Decimal(validatedData.cost) : null,
        quantity: validatedData.quantity,
        serialNumber: validatedData.serialNumber || null,
        notes: validatedData.notes || null,
      },
    });

    // Log activity
    await createActivityLog({
      userId: currentUser.id!,
      action: 'CREATE',
      entityType: 'equipment',
      entityId: equipment.id,
      entityName: equipment.name,
      description: `Created equipment "${equipment.name}" with status ${equipment.status}`,
      metadata: {
        equipmentId: equipment.id,
        status: equipment.status,
        quantity: equipment.quantity,
      },
      bakeryId: equipment.bakeryId,
    });

    revalidatePath('/dashboard/equipment');
    return { success: true, data: equipment };
  } catch (error) {
    console.error('Failed to create equipment:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to create equipment',
    };
  }
}

/**
 * Update existing equipment
 */
export async function updateEquipment(data: UpdateEquipmentInput) {
  try {
    const currentUser = await getCurrentUser();

    if (!currentUser) {
      return { success: false, error: 'Unauthorized: You must be logged in' };
    }

    // Validate input
    const validatedData = updateEquipmentSchema.parse(data);

    // Fetch existing equipment to verify ownership
    const existingEquipment = await db.equipment.findUnique({
      where: { id: validatedData.id },
      select: { bakeryId: true, name: true, status: true },
    });

    if (!existingEquipment) {
      return { success: false, error: 'Equipment not found' };
    }

    // Verify user belongs to the same bakery
    if (currentUser.bakeryId !== existingEquipment.bakeryId) {
      return {
        success: false,
        error: 'Unauthorized: You can only update equipment for your bakery',
      };
    }

    // Update equipment
    const equipment = await db.equipment.update({
      where: { id: validatedData.id },
      data: {
        name: validatedData.name,
        status: validatedData.status,
        vendorId: validatedData.vendorId,
        purchaseDate: validatedData.purchaseDate,
        cost: validatedData.cost ? new Decimal(validatedData.cost) : undefined,
        quantity: validatedData.quantity,
        serialNumber: validatedData.serialNumber,
        notes: validatedData.notes,
      },
    });

    // Log activity with status change if applicable
    const statusChanged = validatedData.status && validatedData.status !== existingEquipment.status;
    await createActivityLog({
      userId: currentUser.id!,
      action: 'UPDATE',
      entityType: 'equipment',
      entityId: equipment.id,
      entityName: equipment.name,
      description: statusChanged
        ? `Updated equipment "${equipment.name}" status from ${existingEquipment.status} to ${equipment.status}`
        : `Updated equipment "${equipment.name}"`,
      metadata: {
        equipmentId: equipment.id,
        changes: validatedData,
        ...(statusChanged && {
          statusChange: {
            from: existingEquipment.status,
            to: equipment.status,
          },
        }),
      },
      bakeryId: equipment.bakeryId,
    });

    revalidatePath('/dashboard/equipment');
    revalidatePath(`/dashboard/equipment/${equipment.id}`);
    return { success: true, data: equipment };
  } catch (error) {
    console.error('Failed to update equipment:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to update equipment',
    };
  }
}

/**
 * Delete equipment
 */
export async function deleteEquipment(id: string) {
  try {
    const currentUser = await getCurrentUser();

    if (!currentUser) {
      return { success: false, error: 'Unauthorized: You must be logged in' };
    }

    // Fetch equipment to verify ownership
    const equipment = await db.equipment.findUnique({
      where: { id },
    });

    if (!equipment) {
      return { success: false, error: 'Equipment not found' };
    }

    // Verify user belongs to the same bakery
    if (currentUser.bakeryId !== equipment.bakeryId) {
      return {
        success: false,
        error: 'Unauthorized: You can only delete equipment for your bakery',
      };
    }

    // Delete equipment
    await db.equipment.delete({
      where: { id },
    });

    // Log activity
    await createActivityLog({
      userId: currentUser.id!,
      action: 'DELETE',
      entityType: 'equipment',
      entityId: equipment.id,
      entityName: equipment.name,
      description: `Deleted equipment "${equipment.name}"`,
      metadata: {
        equipmentId: equipment.id,
        status: equipment.status,
      },
      bakeryId: equipment.bakeryId,
    });

    revalidatePath('/dashboard/equipment');
    return { success: true };
  } catch (error) {
    console.error('Failed to delete equipment:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to delete equipment',
    };
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
