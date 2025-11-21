import { db } from '@/lib/db';
import { Decimal } from '@prisma/client/runtime/library';

/**
 * Convert a quantity from one unit to another
 * @param quantity - The amount to convert
 * @param fromUnit - The source unit
 * @param toUnit - The target unit
 * @returns The converted quantity or null if conversion not found
 */
export async function convertUnits(
  quantity: number | Decimal,
  fromUnit: string,
  toUnit: string
): Promise<number | null> {
  // If units are the same, no conversion needed
  if (fromUnit === toUnit) {
    return typeof quantity === 'number' ? quantity : Number(quantity);
  }

  // Look up the conversion factor in the database
  const conversion = await db.unitConversion.findUnique({
    where: {
      fromUnit_toUnit: {
        fromUnit,
        toUnit,
      },
    },
  });

  if (!conversion) {
    console.warn(`No conversion found from ${fromUnit} to ${toUnit}`);
    return null;
  }

  // Apply the conversion factor
  const numQuantity = typeof quantity === 'number' ? quantity : Number(quantity);
  const factor = Number(conversion.factor);

  return numQuantity * factor;
}

/**
 * Get all available conversions for a given unit
 * @param unit - The unit to find conversions for
 * @returns Array of available target units with their conversion factors
 */
export async function getAvailableConversions(unit: string) {
  const conversions = await db.unitConversion.findMany({
    where: {
      fromUnit: unit,
    },
    select: {
      toUnit: true,
      factor: true,
      category: true,
    },
  });

  return conversions.map((c) => ({
    toUnit: c.toUnit,
    factor: Number(c.factor),
    category: c.category,
  }));
}

/**
 * Check if a conversion exists between two units
 * @param fromUnit - The source unit
 * @param toUnit - The target unit
 * @returns Boolean indicating if conversion exists
 */
export async function canConvert(fromUnit: string, toUnit: string): Promise<boolean> {
  if (fromUnit === toUnit) {
    return true;
  }

  const conversion = await db.unitConversion.findUnique({
    where: {
      fromUnit_toUnit: {
        fromUnit,
        toUnit,
      },
    },
  });

  return conversion !== null;
}

/**
 * Get the conversion factor between two units
 * @param fromUnit - The source unit
 * @param toUnit - The target unit
 * @returns The conversion factor or null if conversion doesn't exist
 */
export async function getConversionFactor(
  fromUnit: string,
  toUnit: string
): Promise<number | null> {
  if (fromUnit === toUnit) {
    return 1;
  }

  const conversion = await db.unitConversion.findUnique({
    where: {
      fromUnit_toUnit: {
        fromUnit,
        toUnit,
      },
    },
  });

  return conversion ? Number(conversion.factor) : null;
}
