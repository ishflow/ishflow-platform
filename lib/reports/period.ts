export type PeriodLabel = 'this-week' | 'this-month' | 'this-quarter' | 'this-year';

export interface ResolvedPeriod {
  label: PeriodLabel;
  /** Start of the current period (00:00:00.000 UTC on the unit's first day). */
  from: Date;
  /** As-of moment of the query — typically `now`. NOT the end of the calendar unit. */
  to: Date;
  /** Start of the previous full calendar unit (00:00:00.000 UTC on its first day). */
  priorFrom: Date;
  /** Exactly 1 ms before `from` — i.e. the last instant of the previous full unit. */
  priorTo: Date;
}

export function resolvePeriod(label: PeriodLabel, now: Date = new Date()): ResolvedPeriod {
  const to = new Date(now);
  let from: Date;
  let priorFrom: Date;
  switch (label) {
    case 'this-week': {
      const d = new Date(now);
      const day = d.getUTCDay(); // 0=Sun, 1=Mon … 6=Sat
      const diff = (day + 6) % 7; // days since Monday
      d.setUTCDate(d.getUTCDate() - diff);
      d.setUTCHours(0, 0, 0, 0);
      from = d;
      priorFrom = new Date(from);
      priorFrom.setUTCDate(priorFrom.getUTCDate() - 7);
      break;
    }
    case 'this-month':
      from = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1));
      priorFrom = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - 1, 1));
      break;
    case 'this-quarter': {
      const q = Math.floor(now.getUTCMonth() / 3) * 3;
      from = new Date(Date.UTC(now.getUTCFullYear(), q, 1));
      priorFrom = new Date(Date.UTC(now.getUTCFullYear(), q - 3, 1));
      break;
    }
    case 'this-year':
      from = new Date(Date.UTC(now.getUTCFullYear(), 0, 1));
      priorFrom = new Date(Date.UTC(now.getUTCFullYear() - 1, 0, 1));
      break;
    default:
      throw new Error(`Unknown period label: ${label}`);
  }

  const priorTo = new Date(from.getTime() - 1); // exactly 1 ms before this.from

  return { label, from, to, priorFrom, priorTo };
}
