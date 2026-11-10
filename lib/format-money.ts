/**
 * Format a numeric money value using Intl.NumberFormat.
 *
 * - null / undefined / empty string → em-dash '—'
 * - string input → coerced via Number()
 * - NaN after coercion → raw input string returned unchanged
 * - currency omitted/empty → plain number with 2 decimal places (no symbol)
 * - currency provided → Intl currency style with symbol
 */
export function formatMoney(
  value: number | string | null | undefined,
  locale: string,
  currency?: string,
): string {
  if (value === null || value === undefined || value === '') return '—';
  const n = typeof value === 'number' ? value : Number(value);
  if (Number.isNaN(n)) return String(value);
  if (!currency) {
    return new Intl.NumberFormat(locale, {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(n);
  }
  return new Intl.NumberFormat(locale, { style: 'currency', currency }).format(n);
}
