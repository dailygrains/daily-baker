/**
 * Inventory utility functions for FIFO lot-based inventory management
 */

import { Decimal } from '@prisma/client/runtime/library';
import { convertQuantity, getConversionFactorSync } from './unitConvert';

// Type that accepts both Decimal and number (for flexibility between Prisma and serialized data)
type NumericValue = Decimal | number | { toNumber: () => number };

// Helper to convert any numeric value to number
function toNumber(value: NumericValue): number {
  if (typeof value === 'number') return value;
  if (typeof value === 'object' && 'toNumber' in value) return value.toNumber();
  return Number(value);
}

// Type for inventory with lots included
export interface InventoryLot {
  id: string;
  purchaseQty: NumericValue;
  remainingQty: NumericValue;
  purchaseUnit: string;
  costPerUnit: NumericValue;
  purchasedAt: Date;
  expiresAt: Date | null;
  vendorId: string | null;
  notes: string | null;
}

export interface InventoryWithLots {
  id: string;
  displayUnit: string;
  lots: InventoryLot[];
}

/**
 * Calculate total quantity in display units from all lots with remaining inventory
 */
export function getTotalQuantity(inventory: InventoryWithLots): number {
  return inventory.lots.reduce((sum, lot) => {
    const remaining = Number(lot.remainingQty);
    if (remaining <= 0) return sum;

    const inDisplayUnit = convertQuantity(
      remaining,
      lot.purchaseUnit,
      inventory.displayUnit
    );

    return sum + (inDisplayUnit ?? 0);
  }, 0);
}

/**
 * Calculate weighted average cost per display unit
 * Cost = SUM(remainingQty * costPerUnit) / SUM(remainingQty)
 * All quantities converted to display unit for consistent calculation
 */
export function getWeightedAverageCost(inventory: InventoryWithLots): number {
  let totalValue = 0;
  let totalQty = 0;

  for (const lot of inventory.lots) {
    const remaining = Number(lot.remainingQty);
    if (remaining <= 0) continue;

    // Convert remaining qty to display unit
    const qtyInDisplay = convertQuantity(
      remaining,
      lot.purchaseUnit,
      inventory.displayUnit
    );

    if (qtyInDisplay === null || qtyInDisplay === 0) continue;

    // Convert cost to per-display-unit
    // If lot is in lbs at $5/lb and display is kg, we need cost per kg
    const conversionFactor = getConversionFactorSync(
      lot.purchaseUnit,
      inventory.displayUnit
    );

    if (conversionFactor === null || conversionFactor === 0) continue;

    // Cost per display unit = cost per purchase unit / conversion factor
    // Example: $5/lb, 1 lb = 0.453592 kg
    // Cost per kg = $5 / 0.453592 = $11.02/kg
    const costPerDisplayUnit = Number(lot.costPerUnit) / conversionFactor;

    totalValue += qtyInDisplay * costPerDisplayUnit;
    totalQty += qtyInDisplay;
  }

  return totalQty > 0 ? totalValue / totalQty : 0;
}

/**
 * Calculate total inventory value (quantity × cost)
 */
export function getTotalValue(inventory: InventoryWithLots): number {
  let totalValue = 0;

  for (const lot of inventory.lots) {
    const remaining = Number(lot.remainingQty);
    if (remaining <= 0) continue;

    // Value is simply remaining qty × cost per unit (in lot's unit)
    totalValue += remaining * Number(lot.costPerUnit);
  }

  return totalValue;
}

/**
 * Get lots that are expiring soon (within specified days)
 */
export function getExpiringLots(
  inventory: InventoryWithLots,
  withinDays: number = 7
): InventoryLot[] {
  const cutoffDate = new Date();
  cutoffDate.setDate(cutoffDate.getDate() + withinDays);

  return inventory.lots.filter((lot) => {
    if (Number(lot.remainingQty) <= 0) return false;
    if (!lot.expiresAt) return false;
    return lot.expiresAt <= cutoffDate;
  });
}

/**
 * Get expired lots (expiration date in the past)
 */
export function getExpiredLots(inventory: InventoryWithLots): InventoryLot[] {
  const now = new Date();

  return inventory.lots.filter((lot) => {
    if (Number(lot.remainingQty) <= 0) return false;
    if (!lot.expiresAt) return false;
    return lot.expiresAt < now;
  });
}

/**
 * Result of FIFO usage calculation
 */
export interface FIFOUsageResult {
  usages: { lotId: string; quantity: number; lotUnit: string }[];
  totalFulfilled: number;  // Amount actually available (in display unit)
  totalRequested: number;  // Amount requested (in display unit)
  shortfall: number;       // Amount that couldn't be fulfilled (in display unit)
  hasShortfall: boolean;   // Quick check for insufficient inventory
}

/**
 * Calculate how much inventory would be consumed by FIFO from each lot
 * Returns usage breakdown with shortfall information if insufficient inventory
 * Never returns null - always returns result with shortfall info if needed
 */
export function calculateFIFOUsage(
  inventory: InventoryWithLots,
  requestedQuantity: number,
  requestedUnit: string
): FIFOUsageResult {
  // Convert requested quantity to display unit for consistent comparison
  const requestedInDisplay = convertQuantity(
    requestedQuantity,
    requestedUnit,
    inventory.displayUnit
  );

  if (requestedInDisplay === null) {
    console.warn(
      `Cannot convert ${requestedQuantity} ${requestedUnit} to ${inventory.displayUnit}`
    );
    return {
      usages: [],
      totalFulfilled: 0,
      totalRequested: requestedQuantity,
      shortfall: requestedQuantity,
      hasShortfall: true,
    };
  }

  let remainingToUse = requestedInDisplay;
  let totalFulfilled = 0;
  const usages: { lotId: string; quantity: number; lotUnit: string }[] = [];

  // Sort lots by purchasedAt (oldest first) - FIFO
  const sortedLots = [...inventory.lots]
    .filter((lot) => Number(lot.remainingQty) > 0)
    .sort(
      (a, b) =>
        new Date(a.purchasedAt).getTime() - new Date(b.purchasedAt).getTime()
    );

  for (const lot of sortedLots) {
    if (remainingToUse <= 0.0001) break; // Small tolerance for floating point

    // Convert lot's remaining to display unit
    const lotRemainingInDisplay = convertQuantity(
      Number(lot.remainingQty),
      lot.purchaseUnit,
      inventory.displayUnit
    );

    if (lotRemainingInDisplay === null || lotRemainingInDisplay <= 0) continue;

    // How much to take from this lot (in display units)
    const takeFromLotInDisplay = Math.min(remainingToUse, lotRemainingInDisplay);

    // Convert back to lot's unit for storage
    const takeInLotUnit = convertQuantity(
      takeFromLotInDisplay,
      inventory.displayUnit,
      lot.purchaseUnit
    );

    if (takeInLotUnit === null || takeInLotUnit <= 0) continue;

    usages.push({
      lotId: lot.id,
      quantity: takeInLotUnit,
      lotUnit: lot.purchaseUnit,
    });

    totalFulfilled += takeFromLotInDisplay;
    remainingToUse -= takeFromLotInDisplay;
  }

  // Calculate shortfall (amount that couldn't be fulfilled)
  const shortfall = Math.max(0, remainingToUse);

  return {
    usages,
    totalFulfilled,
    totalRequested: requestedInDisplay,
    shortfall,
    hasShortfall: shortfall > 0.0001,
  };
}

/**
 * Check inventory levels for a list of ingredients and return warnings
 * Used when creating bake sheets to warn about insufficient inventory
 */
export function checkInventoryLevels(
  ingredientRequirements: Array<{
    ingredientId: string;
    ingredientName: string;
    requiredQuantity: number;
    requiredUnit: string;
    inventory: InventoryWithLots | null;
  }>
): Array<{
  ingredientId: string;
  ingredientName: string;
  required: number;
  available: number;
  shortfall: number;
  unit: string;
}> {
  const warnings: Array<{
    ingredientId: string;
    ingredientName: string;
    required: number;
    available: number;
    shortfall: number;
    unit: string;
  }> = [];

  for (const req of ingredientRequirements) {
    if (!req.inventory) {
      // No inventory record at all
      warnings.push({
        ingredientId: req.ingredientId,
        ingredientName: req.ingredientName,
        required: req.requiredQuantity,
        available: 0,
        shortfall: req.requiredQuantity,
        unit: req.requiredUnit,
      });
      continue;
    }

    const fifoResult = calculateFIFOUsage(
      req.inventory,
      req.requiredQuantity,
      req.requiredUnit
    );

    if (fifoResult.hasShortfall) {
      warnings.push({
        ingredientId: req.ingredientId,
        ingredientName: req.ingredientName,
        required: fifoResult.totalRequested,
        available: fifoResult.totalFulfilled,
        shortfall: fifoResult.shortfall,
        unit: req.inventory.displayUnit,
      });
    }
  }

  return warnings;
}

/**
 * Format quantity with appropriate precision
 */
export function formatQuantity(value: number, decimals: number = 3): string {
  return value.toFixed(decimals);
}

/**
 * Format currency value
 */
export function formatCurrency(value: number, decimals: number = 2): string {
  return `$${value.toFixed(decimals)}`;
}
