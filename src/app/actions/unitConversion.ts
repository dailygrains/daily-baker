'use server';

import { db } from '@/lib/db';
import { getCurrentUser } from '@/lib/clerk';
import { revalidatePath } from 'next/cache';
import { actionContext, actionError, UNAUTHORIZED, type ActionResult } from '@/lib/services/action';
import * as unitConversionService from '@/lib/services/unitConversion';
import {
  deleteUnitConversionSchema,
  type CreateUnitConversionInput,
  type UpdateUnitConversionInput,
  type DeleteUnitConversionInput,
} from '@/lib/validations/unitConversion';

type ConversionResult = ActionResult<
  Awaited<ReturnType<typeof unitConversionService.createUnitConversion>>
>;

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
export async function createUnitConversion(data: CreateUnitConversionInput): Promise<ConversionResult> {
  try {
    const ctx = await actionContext();
    if (!ctx) return UNAUTHORIZED;

    const conversion = await unitConversionService.createUnitConversion(ctx, data);

    revalidatePath('/dashboard/platform/unit-conversions');
    return { success: true, data: conversion };
  } catch (error) {
    return actionError(error, 'Failed to create unit conversion');
  }
}

/**
 * Update an existing unit conversion
 */
export async function updateUnitConversion(data: UpdateUnitConversionInput): Promise<ConversionResult> {
  try {
    const ctx = await actionContext();
    if (!ctx) return UNAUTHORIZED;

    const conversion = await unitConversionService.updateUnitConversion(ctx, data.id, data);

    revalidatePath('/dashboard/platform/unit-conversions');
    return { success: true, data: conversion };
  } catch (error) {
    return actionError(error, 'Failed to update unit conversion');
  }
}

/**
 * Delete a unit conversion
 */
export async function deleteUnitConversion(data: DeleteUnitConversionInput): Promise<ActionResult> {
  try {
    const ctx = await actionContext();
    if (!ctx) return UNAUTHORIZED;

    const { id } = deleteUnitConversionSchema.parse(data);
    await unitConversionService.deleteUnitConversion(ctx, id);

    revalidatePath('/dashboard/platform/unit-conversions');
    return { success: true };
  } catch (error) {
    return actionError(error, 'Failed to delete unit conversion');
  }
}
