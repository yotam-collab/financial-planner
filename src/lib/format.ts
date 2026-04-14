/**
 * Format a number as ILS currency with Hebrew formatting.
 * e.g., 1234567 → "1,234,567 ₪"
 */
export function formatILS(value: number): string {
  const abs = Math.abs(Math.round(value));
  const formatted = abs.toLocaleString('he-IL');
  const sign = value < 0 ? '-' : '';
  return `${sign}${formatted} ₪`;
}

/**
 * Format a number in compact form (K/M).
 * e.g., 1234567 → "1.23M", 45000 → "45K"
 */
export function formatCompact(value: number): string {
  const abs = Math.abs(value);
  const sign = value < 0 ? '-' : '';
  if (abs >= 1_000_000) {
    const m = abs / 1_000_000;
    return `${sign}${m % 1 === 0 ? m.toFixed(0) : m.toFixed(1)}M`;
  }
  if (abs >= 1_000) {
    const k = abs / 1_000;
    return `${sign}${k % 1 === 0 ? k.toFixed(0) : k.toFixed(0)}K`;
  }
  return `${sign}${Math.round(abs).toLocaleString('he-IL')}`;
}

/**
 * Format compact with ILS symbol.
 */
export function formatCompactILS(value: number): string {
  return `${formatCompact(value)} ₪`;
}

/**
 * Format a percentage.
 */
export function formatPercent(value: number, decimals: number = 1): string {
  return `${(value * 100).toFixed(decimals)}%`;
}
