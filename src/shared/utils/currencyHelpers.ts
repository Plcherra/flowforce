/**
 * Shared currency formatting utilities
 */

/**
 * Format currency value for display
 */
export function formatCurrency(
  value?: number | null,
  currency: string = "USD",
): string {
  if (value === null || value === undefined || Number.isNaN(value)) {
    return "—";
  }

  try {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency,
      maximumFractionDigits: 2,
      minimumFractionDigits: 2,
    }).format(value);
  } catch {
    return `$${value.toFixed(2)}`;
  }
}

/**
 * Format number as currency with symbol
 */
export function formatCurrencyWithSymbol(
  value: number,
  symbol: string = "$",
): string {
  if (Number.isNaN(value)) return "—";
  return `${symbol}${value.toFixed(2)}`;
}
