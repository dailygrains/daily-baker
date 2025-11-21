'use server';

import { db } from '@/lib/db';
import { getCurrentUser } from '@/lib/clerk';
import { revalidatePath } from 'next/cache';
import { Decimal } from '@prisma/client/runtime/library';
import {
  createUnitConversionSchema,
  updateUnitConversionSchema,
  deleteUnitConversionSchema,
  type CreateUnitConversionInput,
  type UpdateUnitConversionInput,
  type DeleteUnitConversionInput,
} from '@/lib/validations/unitConversion';

/**
 * Get all unit conversions
 */
export async function getUnitConversions() {
  try {
    const currentUser = await getCurrentUser();
    if (!currentUser) {
      return { success: false, error: 'Unauthorized' };
    }

    // Only platform admins can view all unit conversions
    if (!currentUser.isPlatformAdmin) {
      return { success: false, error: 'Insufficient permissions' };
    }

    const conversions = await db.unitConversion.findMany({
      orderBy: [{ category: 'asc' }, { fromUnit: 'asc' }],
    });

    return { success: true, data: conversions };
  } catch (error) {
    console.error('Failed to fetch unit conversions:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to fetch unit conversions',
    };
  }
}

/**
 * Create a new unit conversion
 */
export async function createUnitConversion(data: CreateUnitConversionInput) {
  try {
    const currentUser = await getCurrentUser();
    if (!currentUser) {
      return { success: false, error: 'Unauthorized' };
    }

    // Only platform admins can create unit conversions
    if (!currentUser.isPlatformAdmin) {
      return { success: false, error: 'Insufficient permissions' };
    }

    // Validate input
    const validatedData = createUnitConversionSchema.parse(data);

    // Check if conversion already exists
    const existing = await db.unitConversion.findUnique({
      where: {
        fromUnit_toUnit: {
          fromUnit: validatedData.fromUnit,
          toUnit: validatedData.toUnit,
        },
      },
    });

    if (existing) {
      return {
        success: false,
        error: `Conversion from ${validatedData.fromUnit} to ${validatedData.toUnit} already exists`,
      };
    }

    // Create the unit conversion
    const conversion = await db.unitConversion.create({
      data: {
        fromUnit: validatedData.fromUnit,
        toUnit: validatedData.toUnit,
        factor: new Decimal(validatedData.factor),
        category: validatedData.category,
      },
    });

    revalidatePath('/dashboard/platform/unit-conversions');

    return { success: true, data: conversion };
  } catch (error) {
    console.error('Failed to create unit conversion:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to create unit conversion',
    };
  }
}

/**
 * Update an existing unit conversion
 */
export async function updateUnitConversion(data: UpdateUnitConversionInput) {
  try {
    const currentUser = await getCurrentUser();
    if (!currentUser) {
      return { success: false, error: 'Unauthorized' };
    }

    // Only platform admins can update unit conversions
    if (!currentUser.isPlatformAdmin) {
      return { success: false, error: 'Insufficient permissions' };
    }

    // Validate input
    const validatedData = updateUnitConversionSchema.parse(data);

    // Check if conversion exists
    const existing = await db.unitConversion.findUnique({
      where: { id: validatedData.id },
    });

    if (!existing) {
      return { success: false, error: 'Unit conversion not found' };
    }

    // Update the unit conversion
    const updateData: any = {};
    if (validatedData.factor !== undefined) {
      updateData.factor = new Decimal(validatedData.factor);
    }
    if (validatedData.category !== undefined) {
      updateData.category = validatedData.category;
    }

    const conversion = await db.unitConversion.update({
      where: { id: validatedData.id },
      data: updateData,
    });

    revalidatePath('/dashboard/platform/unit-conversions');

    return { success: true, data: conversion };
  } catch (error) {
    console.error('Failed to update unit conversion:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to update unit conversion',
    };
  }
}

/**
 * Delete a unit conversion
 */
export async function deleteUnitConversion(data: DeleteUnitConversionInput) {
  try {
    const currentUser = await getCurrentUser();
    if (!currentUser) {
      return { success: false, error: 'Unauthorized' };
    }

    // Only platform admins can delete unit conversions
    if (!currentUser.isPlatformAdmin) {
      return { success: false, error: 'Insufficient permissions' };
    }

    // Validate input
    const validatedData = deleteUnitConversionSchema.parse(data);

    // Check if conversion exists
    const existing = await db.unitConversion.findUnique({
      where: { id: validatedData.id },
    });

    if (!existing) {
      return { success: false, error: 'Unit conversion not found' };
    }

    // Delete the unit conversion
    await db.unitConversion.delete({
      where: { id: validatedData.id },
    });

    revalidatePath('/dashboard/platform/unit-conversions');

    return { success: true };
  } catch (error) {
    console.error('Failed to delete unit conversion:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to delete unit conversion',
    };
  }
}
