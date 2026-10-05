'use server';

import { db } from '@/lib/db';
import { getCurrentUser } from '@/lib/clerk';
import { createActivityLog } from './activity';
import {
  createSupplySchema,
  updateSupplySchema,
  type CreateSupplyInput,
  type UpdateSupplyInput,
} from '@/lib/validations/supply';
import { revalidatePath } from 'next/cache';
import { Decimal } from '@prisma/client/runtime/library';

export async function createSupply(data: CreateSupplyInput) {
  try {
    const currentUser = await getCurrentUser();
    if (!currentUser) {
      return { success: false, error: 'Unauthorized: You must be logged in' };
    }
    if (currentUser.bakeryId !== data.bakeryId) {
      return { success: false, error: 'Unauthorized: You can only create supplies for your bakery' };
    }

    const validatedData = createSupplySchema.parse(data);
    const { vendorIds, ...supplyData } = validatedData;

    const supply = await db.supply.create({
      data: {
        bakeryId: supplyData.bakeryId,
        name: supplyData.name,
        sku: supplyData.sku || null,
        category: supplyData.category,
        description: supplyData.description || null,
        unit: supplyData.unit,
        unitsPerCase: supplyData.unitsPerCase || null,
        costPerUnit: new Decimal(supplyData.costPerUnit),
        quantityOnHand: new Decimal(supplyData.quantityOnHand),
        lowStockThreshold: supplyData.lowStockThreshold != null ? new Decimal(supplyData.lowStockThreshold) : null,
        ...(vendorIds && vendorIds.length > 0 && {
          vendors: {
            create: vendorIds.map((vendorId) => ({ vendorId })),
          },
        }),
      },
    });

    await createActivityLog({
      userId: currentUser.id!,
      action: 'CREATE',
      entityType: 'supply',
      entityId: supply.id,
      entityName: supply.name,
      description: `Created supply "${supply.name}" (${supply.category})`,
      metadata: { supplyId: supply.id, category: supply.category },
      bakeryId: supply.bakeryId,
    });

    revalidatePath('/dashboard/supplies');
    return { success: true, data: supply };
  } catch (error) {
    console.error('Failed to create supply:', error);
    return { success: false, error: error instanceof Error ? error.message : 'Failed to create supply' };
  }
}

export async function updateSupply(data: UpdateSupplyInput) {
  try {
    const currentUser = await getCurrentUser();
    if (!currentUser) {
      return { success: false, error: 'Unauthorized: You must be logged in' };
    }

    const validatedData = updateSupplySchema.parse(data);
    const { vendorIds, ...updateFields } = validatedData;

    const existing = await db.supply.findUnique({
      where: { id: validatedData.id },
      select: { bakeryId: true, name: true },
    });
    if (!existing) {
      return { success: false, error: 'Supply not found' };
    }
    if (currentUser.bakeryId !== existing.bakeryId) {
      return { success: false, error: 'Unauthorized: You can only update supplies for your bakery' };
    }

    const supply = await db.supply.update({
      where: { id: validatedData.id },
      data: {
        name: updateFields.name,
        sku: updateFields.sku,
        category: updateFields.category,
        description: updateFields.description,
        unit: updateFields.unit,
        unitsPerCase: updateFields.unitsPerCase,
        costPerUnit: updateFields.costPerUnit != null ? new Decimal(updateFields.costPerUnit) : undefined,
        quantityOnHand: updateFields.quantityOnHand != null ? new Decimal(updateFields.quantityOnHand) : undefined,
        lowStockThreshold: updateFields.lowStockThreshold != null ? new Decimal(updateFields.lowStockThreshold) : undefined,
        ...(vendorIds !== undefined && {
          vendors: {
            deleteMany: {},
            create: vendorIds.map((vendorId) => ({ vendorId })),
          },
        }),
      },
    });

    await createActivityLog({
      userId: currentUser.id!,
      action: 'UPDATE',
      entityType: 'supply',
      entityId: supply.id,
      entityName: supply.name,
      description: `Updated supply "${supply.name}"`,
      metadata: { supplyId: supply.id, changes: validatedData },
      bakeryId: supply.bakeryId,
    });

    revalidatePath('/dashboard/supplies');
    revalidatePath(`/dashboard/supplies/${supply.id}`);
    return { success: true, data: supply };
  } catch (error) {
    console.error('Failed to update supply:', error);
    return { success: false, error: error instanceof Error ? error.message : 'Failed to update supply' };
  }
}

export async function deleteSupply(id: string) {
  try {
    const currentUser = await getCurrentUser();
    if (!currentUser) {
      return { success: false, error: 'Unauthorized: You must be logged in' };
    }

    const supply = await db.supply.findUnique({
      where: { id },
      include: { productSupplies: { select: { id: true }, take: 1 } },
    });
    if (!supply) {
      return { success: false, error: 'Supply not found' };
    }
    if (currentUser.bakeryId !== supply.bakeryId) {
      return { success: false, error: 'Unauthorized: You can only delete supplies for your bakery' };
    }
    if (supply.productSupplies.length > 0) {
      return { success: false, error: 'Cannot delete supply that is used in products. Remove it from all products first.' };
    }

    await db.supply.delete({ where: { id } });

    await createActivityLog({
      userId: currentUser.id!,
      action: 'DELETE',
      entityType: 'supply',
      entityId: supply.id,
      entityName: supply.name,
      description: `Deleted supply "${supply.name}"`,
      metadata: { supplyId: supply.id, category: supply.category },
      bakeryId: supply.bakeryId,
    });

    revalidatePath('/dashboard/supplies');
    return { success: true };
  } catch (error) {
    console.error('Failed to delete supply:', error);
    return { success: false, error: error instanceof Error ? error.message : 'Failed to delete supply' };
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
