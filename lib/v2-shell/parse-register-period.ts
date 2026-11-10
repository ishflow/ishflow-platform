import type { PeriodSelection } from '@/platform/metadata';

/**
 * Parses the `?period=` URL search param into a typed `PeriodSelection`.
 *
 * Accepted shapes:
 * - `undefined`         → current month (UTC)
 * - `'2026-05'`         → calendar month
 * - `'2026-05-16'`      → single day
 * - `'2026-05_2026-07'` → month range `[2026-05-01, 2026-08-01)` (inclusive end month)
 * - `'2026-05-16_2026-07-20'` → day range `[2026-05-16, 2026-07-21)` (inclusive end day)
 * - garbage             → fallback to current month (do not throw — render
 *                          params are untrusted)
 *
 * `start` is inclusive, `end` exclusive. All instants are UTC; tenant
 * timezone awareness is a follow-up.
 *
 * `now` is injectable for tests; production callers pass `new Date()`.
 */
export function parseRegisterPeriod(param: string | undefined, now: Date): PeriodSelection {
  if (!param) return monthOf(now);

  const monthMatch = /^(\d{4})-(0[1-9]|1[0-2])$/.exec(param);
  if (monthMatch) {
    return month(Number(monthMatch[1]), Number(monthMatch[2]));
  }

  const dayMatch = /^(\d{4})-(0[1-9]|1[0-2])-(0[1-9]|[12]\d|3[01])$/.exec(param);
  if (dayMatch) {
    const y = Number(dayMatch[1]);
    const m = Number(dayMatch[2]);
    const d = Number(dayMatch[3]);
    return day(y, m, d);
  }

  // Day-level custom range: `2026-05-16_2026-07-20` → [2026-05-16, 2026-07-21)
  // (end inclusive in the URL form, exclusive internally). Powers the
  // "start date – end date" filter on registers + reports.
  const dayRangeMatch =
    /^(\d{4})-(0[1-9]|1[0-2])-(0[1-9]|[12]\d|3[01])_(\d{4})-(0[1-9]|1[0-2])-(0[1-9]|[12]\d|3[01])$/.exec(
      param,
    );
  if (dayRangeMatch) {
    const start = new Date(
      Date.UTC(Number(dayRangeMatch[1]), Number(dayRangeMatch[2]) - 1, Number(dayRangeMatch[3])),
    );
    const endInclusive = new Date(
      Date.UTC(Number(dayRangeMatch[4]), Number(dayRangeMatch[5]) - 1, Number(dayRangeMatch[6])),
    );
    const end = new Date(endInclusive.getTime() + 86_400_000);
    if (end > start) {
      return { kind: 'range', start, end };
    }
  }

  const rangeMatch = /^(\d{4})-(0[1-9]|1[0-2])_(\d{4})-(0[1-9]|1[0-2])$/.exec(param);
  if (rangeMatch) {
    const start = new Date(Date.UTC(Number(rangeMatch[1]), Number(rangeMatch[2]) - 1, 1));
    const end = new Date(Date.UTC(Number(rangeMatch[3]), Number(rangeMatch[4]), 1));
    if (end > start) {
      return { kind: 'range', start, end };
    }
  }

  return monthOf(now);
}

function monthOf(d: Date): PeriodSelection {
  return month(d.getUTCFullYear(), d.getUTCMonth() + 1);
}

function month(year: number, m: number): PeriodSelection {
  const start = new Date(Date.UTC(year, m - 1, 1));
  const end = new Date(Date.UTC(year, m, 1));
  return { kind: 'month', year, month: m, start, end };
}

function day(year: number, m: number, d: number): PeriodSelection {
  const start = new Date(Date.UTC(year, m - 1, d));
  const end = new Date(Date.UTC(year, m - 1, d + 1));
  return { kind: 'day', date: start, start, end };
}

/** Serialize a PeriodSelection back to the URL param shape. */
export function serializeRegisterPeriod(p: PeriodSelection): string {
  if (p.kind === 'month') return `${p.year}-${String(p.month).padStart(2, '0')}`;
  if (p.kind === 'day') {
    const y = p.date.getUTCFullYear();
    const m = String(p.date.getUTCMonth() + 1).padStart(2, '0');
    const d = String(p.date.getUTCDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
  }
  // A range that starts on the 1st and ends on a month boundary is a whole-month
  // range → emit the compact `YYYY-MM_YYYY-MM` form. Otherwise it's a day-level
  // custom range → emit `YYYY-MM-DD_YYYY-MM-DD` (end inclusive) so granularity
  // round-trips.
  const startIsMonthStart = p.start.getUTCDate() === 1;
  const endIsMonthStart = p.end.getUTCDate() === 1;
  if (startIsMonthStart && endIsMonthStart) {
    const sy = p.start.getUTCFullYear();
    const sm = String(p.start.getUTCMonth() + 1).padStart(2, '0');
    // end is exclusive, but URL form uses inclusive month — subtract 1.
    const endInclusive = new Date(p.end);
    endInclusive.setUTCDate(0); // step to last day of previous month
    const ey = endInclusive.getUTCFullYear();
    const em = String(endInclusive.getUTCMonth() + 1).padStart(2, '0');
    return `${sy}-${sm}_${ey}-${em}`;
  }
  const fmtDay = (d: Date) =>
    `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}-${String(d.getUTCDate()).padStart(2, '0')}`;
  const endInclusive = new Date(p.end.getTime() - 86_400_000);
  return `${fmtDay(p.start)}_${fmtDay(endInclusive)}`;
}
