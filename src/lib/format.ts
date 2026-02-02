/**
 * Centralized formatting utilities for the app
 */

/**
 * Format a numeric quantity, omitting decimals if the value is a whole number.
 * @param value - The numeric value to format
 * @param maxDecimals - Maximum decimal places to show (default: 3)
 * @returns Formatted string without trailing zeros
 */
export function formatQuantity(value: number, maxDecimals: number = 3): string {
  if (Number.isInteger(value)) {
    return value.toString();
  }

  // Format with max decimals, then remove trailing zeros
  const formatted = value.toFixed(maxDecimals);
  return formatted.replace(/\.?0+$/, '');
}

/**
 * Format a currency value
 * @param value - The numeric value to format
 * @param decimals - Decimal places (default: 2)
 * @returns Formatted currency string with $ prefix
 */
export function formatCurrency(value: number, decimals: number = 2): string {
  return `$${value.toFixed(decimals)}`;
}
