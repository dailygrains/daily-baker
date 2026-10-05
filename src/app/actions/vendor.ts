'use server';

import { db } from '@/lib/db';
import { getCurrentUser } from '@/lib/clerk';
import type { CreateVendorInput, UpdateVendorInput } from '@/lib/validations/vendor';
import { revalidatePath } from 'next/cache';
import { actionContext, actionError, UNAUTHORIZED, type ActionResult } from '@/lib/services/action';
import * as vendorService from '@/lib/services/vendor';

type VendorResult = ActionResult<Awaited<ReturnType<typeof vendorService.createVendor>>>;

/**
 * Create a new vendor
 */
export async function createVendor(data: CreateVendorInput): Promise<VendorResult> {
  try {
    const ctx = await actionContext();
    if (!ctx) return UNAUTHORIZED;
    if (ctx.bakeryId !== data.bakeryId) {
      return { success: false, error: 'Unauthorized: You can only create vendors for your bakery' };
    }

    const vendor = await vendorService.createVendor(ctx, data);

    revalidatePath('/dashboard/vendors');
    return { success: true, data: vendor };
  } catch (error) {
    return actionError(error, 'Failed to create vendor');
  }
}

/**
 * Update an existing vendor
 */
export async function updateVendor(data: UpdateVendorInput): Promise<VendorResult> {
  try {
    const ctx = await actionContext();
    if (!ctx) return UNAUTHORIZED;

    const vendor = await vendorService.updateVendor(ctx, data.id, data);

    revalidatePath('/dashboard/vendors');
    revalidatePath(`/dashboard/vendors/${vendor.id}`);
    return { success: true, data: vendor };
  } catch (error) {
    return actionError(error, 'Failed to update vendor');
  }
}

/**
 * Delete a vendor
 */
export async function deleteVendor(id: string): Promise<ActionResult> {
  try {
    const ctx = await actionContext();
    if (!ctx) return UNAUTHORIZED;

    await vendorService.deleteVendor(ctx, id);

    revalidatePath('/dashboard/vendors');
    return { success: true };
  } catch (error) {
    return actionError(error, 'Failed to delete vendor');
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
