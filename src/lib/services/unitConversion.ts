import { Decimal } from '@prisma/client/runtime/library';
import { db } from '@/lib/db';
import {
  createUnitConversionSchema,
  updateUnitConversionSchema,
} from '@/lib/validations/unitConversion';
import { ServiceError, notFound, type ServiceContext } from './context';
import { requireAdmin } from './admin';

/**
 * Unit conversions are global reference data (no bakeryId): anyone signed in
 * can read them, only platform admins can change them.
 */
export async function createUnitConversion(ctx: ServiceContext, input: unknown) {
  requireAdmin(ctx, 'create unit conversions');
  const data = createUnitConversionSchema.parse(input);

  const existing = await db.unitConversion.findUnique({
    where: { fromUnit_toUnit: { fromUnit: data.fromUnit, toUnit: data.toUnit } },
  });
  if (existing) {
    throw new ServiceError(409, `Conversion from ${data.fromUnit} to ${data.toUnit} already exists`);
  }

  return db.unitConversion.create({
    data: {
      fromUnit: data.fromUnit,
      toUnit: data.toUnit,
      factor: new Decimal(data.factor),
      category: data.category,
    },
  });
}

export async function updateUnitConversion(ctx: ServiceContext, id: string, input: unknown) {
  requireAdmin(ctx, 'update unit conversions');
  const data = updateUnitConversionSchema.parse({ ...(input as object), id });

  const existing = await db.unitConversion.findUnique({ where: { id } });
  if (!existing) throw notFound('Unit conversion');

  return db.unitConversion.update({
    where: { id },
    data: {
      ...(data.factor !== undefined && { factor: new Decimal(data.factor) }),
      ...(data.category != null && { category: data.category }),
    },
  });
}

export async function deleteUnitConversion(ctx: ServiceContext, id: string) {
  requireAdmin(ctx, 'delete unit conversions');

  const existing = await db.unitConversion.findUnique({ where: { id } });
  if (!existing) throw notFound('Unit conversion');

  await db.unitConversion.delete({ where: { id } });
  return existing;
}
