'use server';

import { db } from '@/lib/db';
import { getCurrentUser } from '@/lib/clerk';
import { createActivityLog } from './activity';
import {
  createVendorSchema,
  updateVendorSchema,
  type CreateVendorInput,
  type UpdateVendorInput,
} from '@/lib/validations/vendor';
import { revalidatePath } from 'next/cache';

/**
 * Create a new vendor
 */
export async function createVendor(data: CreateVendorInput) {
  try {
    const currentUser = await getCurrentUser();

    if (!currentUser) {
      return { success: false, error: 'Unauthorized: You must be logged in' };
    }

    // Verify user belongs to the bakery
    if (currentUser.bakeryId !== data.bakeryId) {
      return {
        success: false,
        error: 'Unauthorized: You can only create vendors for your bakery',
      };
    }

    // Validate input
    const validatedData = createVendorSchema.parse(data);

    // Create vendor
    const vendor = await db.vendor.create({
      data: {
        bakeryId: validatedData.bakeryId,
        name: validatedData.name,
        email: validatedData.email || null,
        phone: validatedData.phone || null,
        website: validatedData.website || null,
        notes: validatedData.notes || null,
      },
    });

    // Log activity
    await createActivityLog({
      userId: currentUser.id!,
      action: 'CREATE',
      entityType: 'vendor',
      entityId: vendor.id,
      entityName: vendor.name,
      description: `Created vendor "${vendor.name}"`,
      metadata: {
        vendorId: vendor.id,
      },
      bakeryId: vendor.bakeryId,
    });

    revalidatePath('/dashboard/vendors');
    return { success: true, data: vendor };
  } catch (error) {
    console.error('Failed to create vendor:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to create vendor',
    };
  }
}

/**
 * Update an existing vendor
 */
export async function updateVendor(data: UpdateVendorInput) {
  try {
    const currentUser = await getCurrentUser();

    if (!currentUser) {
      return { success: false, error: 'Unauthorized: You must be logged in' };
    }

    // Validate input
    const validatedData = updateVendorSchema.parse(data);

    // Fetch existing vendor to verify ownership
    const existingVendor = await db.vendor.findUnique({
      where: { id: validatedData.id },
      select: { bakeryId: true, name: true },
    });

    if (!existingVendor) {
      return { success: false, error: 'Vendor not found' };
    }

    // Verify user belongs to the same bakery
    if (currentUser.bakeryId !== existingVendor.bakeryId) {
      return {
        success: false,
        error: 'Unauthorized: You can only update vendors for your bakery',
      };
    }

    // Update vendor
    const vendor = await db.vendor.update({
      where: { id: validatedData.id },
      data: {
        name: validatedData.name,
        email: validatedData.email,
        phone: validatedData.phone,
        website: validatedData.website,
        notes: validatedData.notes,
      },
    });

    // Log activity
    await createActivityLog({
      userId: currentUser.id!,
      action: 'UPDATE',
      entityType: 'vendor',
      entityId: vendor.id,
      entityName: vendor.name,
      description: `Updated vendor "${vendor.name}"`,
      metadata: {
        vendorId: vendor.id,
        changes: validatedData,
      },
      bakeryId: vendor.bakeryId,
    });

    revalidatePath('/dashboard/vendors');
    revalidatePath(`/dashboard/vendors/${vendor.id}`);
    return { success: true, data: vendor };
  } catch (error) {
    console.error('Failed to update vendor:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to update vendor',
    };
  }
}

/**
 * Delete a vendor
 */
export async function deleteVendor(id: string) {
  try {
    const currentUser = await getCurrentUser();

    if (!currentUser) {
      return { success: false, error: 'Unauthorized: You must be logged in' };
    }

    // Fetch vendor with counts to verify ownership and check dependencies
    const vendor = await db.vendor.findUnique({
      where: { id },
      include: {
        _count: {
          select: {
            ingredients: true,
            equipment: true,
          },
        },
      },
    });

    if (!vendor) {
      return { success: false, error: 'Vendor not found' };
    }

    // Verify user belongs to the same bakery
    if (currentUser.bakeryId !== vendor.bakeryId) {
      return {
        success: false,
        error: 'Unauthorized: You can only delete vendors for your bakery',
      };
    }

    // Check if vendor has linked ingredients or equipment
    if (vendor._count.ingredients > 0 || vendor._count.equipment > 0) {
      return {
        success: false,
        error: `Cannot delete vendor with ${vendor._count.ingredients} linked ingredient(s) and ${vendor._count.equipment} linked equipment item(s). Please unlink them first.`,
      };
    }

    // Delete vendor
    await db.vendor.delete({
      where: { id },
    });

    // Log activity
    await createActivityLog({
      userId: currentUser.id!,
      action: 'DELETE',
      entityType: 'vendor',
      entityId: vendor.id,
      entityName: vendor.name,
      description: `Deleted vendor "${vendor.name}"`,
      metadata: {
        vendorId: vendor.id,
      },
      bakeryId: vendor.bakeryId,
    });

    revalidatePath('/dashboard/vendors');
    return { success: true };
  } catch (error) {
    console.error('Failed to delete vendor:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to delete vendor',
    };
  }
}

/**
 * Get all vendors for a bakery
 */
export async function getVendorsByBakery(bakeryId: string) {
  try {
    const currentUser = await getCurrentUser();

    if (!currentUser) {
      return { success: false, error: 'Unauthorized: You must be logged in' };
    }

    // Verify user belongs to the bakery
    if (currentUser.bakeryId !== bakeryId) {
      return {
        success: false,
        error: 'Unauthorized: You can only view vendors for your bakery',
      };
    }

    const vendors = await db.vendor.findMany({
      where: { bakeryId },
      include: {
        _count: {
          select: {
            ingredients: true,
            equipment: true,
          },
        },
      },
      orderBy: {
        name: 'asc',
      },
    });

    return { success: true, data: vendors };
  } catch (error) {
    console.error('Failed to fetch vendors:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to fetch vendors',
    };
  }
}

/**
 * Get a single vendor by ID
 */
export async function getVendorById(id: string) {
  try {
    const currentUser = await getCurrentUser();

    if (!currentUser) {
      return { success: false, error: 'Unauthorized: You must be logged in' };
    }

    const vendor = await db.vendor.findUnique({
      where: { id },
      include: {
        ingredients: {
          include: {
            ingredient: {
              select: {
                id: true,
                name: true,
                unit: true,
              },
            },
          },
          orderBy: {
            ingredient: {
              name: 'asc',
            },
          },
        },
        equipment: {
          select: {
            id: true,
            name: true,
            status: true,
            cost: true,
          },
          orderBy: {
            name: 'asc',
          },
        },
        inventoryLots: {
          select: {
            id: true,
            purchaseQty: true,
            remainingQty: true,
            purchaseUnit: true,
            costPerUnit: true,
            purchasedAt: true,
            inventory: {
              select: {
                ingredient: {
                  select: {
                    id: true,
                    name: true,
                  },
                },
              },
            },
          },
          orderBy: {
            purchasedAt: 'desc',
          },
          take: 10, // Last 10 purchases from this vendor
        },
        _count: {
          select: {
            ingredients: true,
            equipment: true,
            inventoryLots: true,
          },
        },
      },
    });

    if (!vendor) {
      return { success: false, error: 'Vendor not found' };
    }

    // Verify user belongs to the same bakery
    if (currentUser.bakeryId !== vendor.bakeryId) {
      return {
        success: false,
        error: 'Unauthorized: You can only view vendors for your bakery',
      };
    }

    // Serialize Decimal fields for client components
    return {
      success: true,
      data: {
        ...vendor,
        ingredients: vendor.ingredients.map((iv) => ({
          ...iv,
          ingredient: iv.ingredient,
        })),
        equipment: vendor.equipment.map((e) => ({
          ...e,
          cost: e.cost ? Number(e.cost) : null,
        })),
        inventoryLots: vendor.inventoryLots.map((lot) => ({
          ...lot,
          purchaseQty: Number(lot.purchaseQty),
          remainingQty: Number(lot.remainingQty),
          costPerUnit: Number(lot.costPerUnit),
        })),
      },
    };
  } catch (error) {
    console.error('Failed to fetch vendor:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to fetch vendor',
    };
  }
}
