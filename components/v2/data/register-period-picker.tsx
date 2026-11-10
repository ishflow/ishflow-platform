'use client';

import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar, ChevronDown } from 'lucide-react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { useState } from 'react';

export type RegisterPeriodPickerProps = {
  /** Pre-rendered label for the capsule, e.g. "Mayıs 2026". */
  label: string;
  /** Locale-aware month-short names (12 strings). Caller resolves via i18n. */
  monthShortNames: string[];
  /** Preset labels — already localized. */
  presets: {
    today: string;
    thisWeek: string;
    thisMonth: string;
    thisYear: string;
  };
  /** Closed-through ISO month string (e.g. "2026-01"). Any month at or
   *  before this is rendered disabled. Absent ⇒ no months disabled. */
  closedThroughMonth?: string | null;
  /** Optional badge text when the current selection overlaps a closed
   *  period (e.g. "Dönem kapalı"). Caller controls when to show it. */
  closedBadge?: string | null;
  /** Current calendar year shown in the popover. Auto-derived from
   *  `?period=` or `now`. */
  initialYear?: number;
  /** Optional "custom day range" UI labels. When BOTH are provided, a
   *  from–to date-range row is shown that pushes `?period=<from>_<to>`
   *  (day-level granularity). */
  customRangeLabel?: string;
  applyLabel?: string;
};

export function V2RegisterPeriodPicker(props: RegisterPeriodPickerProps) {
  const params = useSearchParams();
  const now = new Date();
  const currentYear =
    props.initialYear ?? yearFromParam(params.get('period')) ?? now.getUTCFullYear();
  const [year, setYear] = useState(currentYear);
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const customRange = from && to && from <= to ? `${from}_${to}` : null;

  const closedThrough = props.closedThroughMonth ?? null;
  const isClosedMonth = (iso: string): boolean => {
    if (!closedThrough) return false;
    return iso <= closedThrough;
  };
  const today = `${now.getUTCFullYear()}-${pad2(now.getUTCMonth() + 1)}-${pad2(now.getUTCDate())}`;
  const thisMonth = `${now.getUTCFullYear()}-${pad2(now.getUTCMonth() + 1)}`;
  const thisYearRange = `${now.getUTCFullYear()}-01_${now.getUTCFullYear()}-12`;
  const thisWeekStart = startOfWeekIso(now);

  return (
    <Popover>
      <PopoverTrigger
        render={
          <button className="btn btn-secondary btn-sm" type="button">
            <Calendar size={14} strokeWidth={1.75} />
            {props.label}
            {props.closedBadge ? (
              <span className="pill pill-neutral">{props.closedBadge}</span>
            ) : null}
            <ChevronDown size={14} strokeWidth={1.75} />
          </button>
        }
      />
      <PopoverContent
        className="bg-popover text-popover-foreground z-50 rounded-md border p-3 shadow-md outline-none"
        align="end"
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12, minWidth: 280 }}>
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
            <Link href={hrefFor(params, today)} className="chip" scroll={false}>
              {props.presets.today}
            </Link>
            <Link href={hrefFor(params, thisWeekStart)} className="chip" scroll={false}>
              {props.presets.thisWeek}
            </Link>
            <Link href={hrefFor(params, thisMonth)} className="chip" scroll={false}>
              {props.presets.thisMonth}
            </Link>
            <Link href={hrefFor(params, thisYearRange)} className="chip" scroll={false}>
              {props.presets.thisYear}
            </Link>
          </div>

          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <button
              type="button"
              className="icon-btn"
              aria-label="Previous year"
              onClick={() => setYear((y) => y - 1)}
            >
              ‹
            </button>
            <strong>{year}</strong>
            <button
              type="button"
              className="icon-btn"
              aria-label="Next year"
              onClick={() => setYear((y) => y + 1)}
            >
              ›
            </button>
          </div>

          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(3, 1fr)',
              gap: 6,
            }}
          >
            {props.monthShortNames.map((name, idx) => {
              const m = idx + 1;
              const iso = `${year}-${pad2(m)}`;
              const isClosed = isClosedMonth(iso);
              if (isClosed) {
                return (
                  <span
                    key={iso}
                    aria-disabled
                    className="chip"
                    style={{ opacity: 0.4, cursor: 'not-allowed' }}
                  >
                    {name}
                  </span>
                );
              }
              return (
                <Link key={iso} href={hrefFor(params, iso)} className="chip" scroll={false}>
                  {name}
                </Link>
              );
            })}
          </div>

          {props.customRangeLabel && props.applyLabel ? (
            <div style={{ borderTop: '1px solid var(--border)', paddingTop: 10 }}>
              <div className="dim" style={{ fontSize: 11, marginBottom: 6 }}>
                {props.customRangeLabel}
              </div>
              <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                <input
                  type="date"
                  className="input"
                  style={{ height: 30 }}
                  value={from}
                  max={to || undefined}
                  onChange={(e) => setFrom(e.target.value)}
                  aria-label={props.customRangeLabel}
                />
                <span className="dim">–</span>
                <input
                  type="date"
                  className="input"
                  style={{ height: 30 }}
                  value={to}
                  min={from || undefined}
                  onChange={(e) => setTo(e.target.value)}
                  aria-label={props.customRangeLabel}
                />
                {customRange ? (
                  <Link
                    href={hrefFor(params, customRange)}
                    className="btn btn-secondary btn-sm"
                    scroll={false}
                  >
                    {props.applyLabel}
                  </Link>
                ) : (
                  <span
                    className="btn btn-secondary btn-sm"
                    aria-disabled="true"
                    style={{ opacity: 0.5, cursor: 'not-allowed' }}
                  >
                    {props.applyLabel}
                  </span>
                )}
              </div>
            </div>
          ) : null}
        </div>
      </PopoverContent>
    </Popover>
  );
}

function hrefFor(params: URLSearchParams, periodValue: string): string {
  const next = new URLSearchParams(params);
  next.set('period', periodValue);
  return `?${next.toString()}`;
}

function pad2(n: number): string {
  return String(n).padStart(2, '0');
}

function yearFromParam(p: string | null): number | null {
  if (!p) return null;
  const m = /^(\d{4})/.exec(p);
  return m ? Number(m[1]) : null;
}

function startOfWeekIso(now: Date): string {
  // ISO week start = Monday
  const d = new Date(now);
  const day = d.getUTCDay();
  const diff = (day + 6) % 7;
  d.setUTCDate(d.getUTCDate() - diff);
  return `${d.getUTCFullYear()}-${pad2(d.getUTCMonth() + 1)}-${pad2(d.getUTCDate())}`;
}
