import type { PeriodSelection } from '@/platform/metadata';

/**
 * Returns the natural predecessor of a period selection.
 *
 * - `month` → previous calendar month
 * - `day` → previous calendar day
 * - `range` → prior range of equal length (back-to-back, exclusive on the
 *   forward edge)
 */
export function priorPeriod(p: PeriodSelection): PeriodSelection {
  if (p.kind === 'month') {
    const y = p.month === 1 ? p.year - 1 : p.year;
    const m = p.month === 1 ? 12 : p.month - 1;
    const start = new Date(Date.UTC(y, m - 1, 1));
    const end = new Date(Date.UTC(y, m, 1));
    return { kind: 'month', year: y, month: m, start, end };
  }

  if (p.kind === 'day') {
    const start = new Date(p.date);
    start.setUTCDate(start.getUTCDate() - 1);
    const end = new Date(p.date);
    return { kind: 'day', date: start, start, end };
  }

  // Month-aligned range → use month arithmetic so 3 months of varying length
  // collapse to a clean prior 3-month window. Falls back to timestamp delta
  // for arbitrary ranges (e.g. arbitrary day-windows).
  if (isMonthStart(p.start) && isMonthStart(p.end)) {
    const monthsDiff =
      (p.end.getUTCFullYear() - p.start.getUTCFullYear()) * 12 +
      (p.end.getUTCMonth() - p.start.getUTCMonth());
    const start = new Date(
      Date.UTC(p.start.getUTCFullYear(), p.start.getUTCMonth() - monthsDiff, 1),
    );
    const end = new Date(p.start);
    return { kind: 'range', start, end };
  }

  const ms = p.end.getTime() - p.start.getTime();
  const end = new Date(p.start);
  const start = new Date(p.start.getTime() - ms);
  return { kind: 'range', start, end };
}

function isMonthStart(d: Date): boolean {
  return (
    d.getUTCDate() === 1 &&
    d.getUTCHours() === 0 &&
    d.getUTCMinutes() === 0 &&
    d.getUTCSeconds() === 0 &&
    d.getUTCMilliseconds() === 0
  );
}

export type DeltaResult = {
  direction: 'up' | 'down';
  /** Pre-formatted "▲ 6.2%" / "▼ 12.0%" with locale-aware decimal. */
  formatted: string;
} | null;

/**
 * Computes a percent change vs prior period. Returns null when:
 * - `prior` is zero (cannot divide), or
 * - both `current` and `prior` are zero (no signal).
 *
 * `current` and `prior` may be negative (e.g. net profit). Direction is
 * based on the signed comparison: `current > prior` ⇒ up, else down.
 */
export function formatDelta(current: number, prior: number, locale: string): DeltaResult {
  if (prior === 0) return null;
  const pct = ((current - prior) / Math.abs(prior)) * 100;
  if (!Number.isFinite(pct)) return null;
  const direction: 'up' | 'down' = current >= prior ? 'up' : 'down';
  const arrow = direction === 'up' ? '▲' : '▼';
  const fmt = new Intl.NumberFormat(locale, {
    minimumFractionDigits: 1,
    maximumFractionDigits: 1,
  });
  return { direction, formatted: `${arrow} ${fmt.format(Math.abs(pct))}%` };
}
