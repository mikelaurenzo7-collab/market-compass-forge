/**
 * Institutional-grade number formatting utilities.
 * All currency values: proper comma separators + 2 decimal points.
 * All percentages: capped at 2 decimal points.
 */

export function formatCurrency(value: number | null | undefined): string {
  if (value == null) return "—";
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value);
}

export function formatCurrencyCompact(value: number | null | undefined): string {
  if (value == null) return "—";
  const abs = Math.abs(value);
  if (abs >= 1e9) return `$${(value / 1e9).toFixed(1)}B`;
  if (abs >= 1e6) return `$${(value / 1e6).toFixed(1)}M`;
  if (abs >= 1e3) return `$${(value / 1e3).toFixed(0)}K`;
  return formatCurrency(value);
}

export function formatPercent(value: number | null | undefined, decimals = 2): string {
  if (value == null) return "—";
  return `${value.toFixed(decimals)}%`;
}

export function formatNumber(value: number | null | undefined): string {
  if (value == null) return "—";
  return new Intl.NumberFormat("en-US").format(value);
}

export function formatMultiple(value: number | null | undefined): string {
  if (value == null) return "—";
  return `${value.toFixed(1)}x`;
}
