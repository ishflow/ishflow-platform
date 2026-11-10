import type { PeriodSelection } from '@/platform/metadata';
import { describe, expect, it } from 'vitest';
import { formatDelta, priorPeriod } from './kpi-delta';

describe('priorPeriod', () => {
  it('returns previous month for January (rolls back year)', () => {
    const p: PeriodSelection = {
      kind: 'month',
      year: 2026,
      month: 1,
      start: new Date(Date.UTC(2026, 0, 1)),
      end: new Date(Date.UTC(2026, 1, 1)),
    };
    const prior = priorPeriod(p);
    expect(prior.kind).toBe('month');
    if (prior.kind === 'month') {
      expect(prior.year).toBe(2025);
      expect(prior.month).toBe(12);
      expect(prior.start.toISOString()).toBe('2025-12-01T00:00:00.000Z');
      expect(prior.end.toISOString()).toBe('2026-01-01T00:00:00.000Z');
    }
  });

  it('returns previous month for May', () => {
    const p: PeriodSelection = {
      kind: 'month',
      year: 2026,
      month: 5,
      start: new Date(Date.UTC(2026, 4, 1)),
      end: new Date(Date.UTC(2026, 5, 1)),
    };
    const prior = priorPeriod(p);
    expect(prior.kind).toBe('month');
    if (prior.kind === 'month') {
      expect(prior.month).toBe(4);
      expect(prior.year).toBe(2026);
    }
  });

  it('returns previous day for a day selection', () => {
    const p: PeriodSelection = {
      kind: 'day',
      date: new Date(Date.UTC(2026, 4, 16)),
      start: new Date(Date.UTC(2026, 4, 16)),
      end: new Date(Date.UTC(2026, 4, 17)),
    };
    const prior = priorPeriod(p);
    expect(prior.kind).toBe('day');
    if (prior.kind === 'day') {
      expect(prior.start.toISOString()).toBe('2026-05-15T00:00:00.000Z');
      expect(prior.end.toISOString()).toBe('2026-05-16T00:00:00.000Z');
    }
  });

  it('returns back-to-back range of equal length for a range', () => {
    const p: PeriodSelection = {
      kind: 'range',
      start: new Date(Date.UTC(2026, 4, 1)),
      end: new Date(Date.UTC(2026, 7, 1)), // 3 months
    };
    const prior = priorPeriod(p);
    expect(prior.kind).toBe('range');
    if (prior.kind === 'range') {
      expect(prior.start.toISOString()).toBe('2026-02-01T00:00:00.000Z');
      expect(prior.end.toISOString()).toBe('2026-05-01T00:00:00.000Z');
    }
  });
});

describe('formatDelta', () => {
  it('formats positive change as ▲', () => {
    const d = formatDelta(106.2, 100, 'en');
    expect(d).not.toBeNull();
    expect(d?.direction).toBe('up');
    expect(d?.formatted).toBe('▲ 6.2%');
  });

  it('formats negative change as ▼', () => {
    const d = formatDelta(88, 100, 'en');
    expect(d?.direction).toBe('down');
    expect(d?.formatted).toBe('▼ 12.0%');
  });

  it('uses TR locale decimal comma', () => {
    const d = formatDelta(106.2, 100, 'tr');
    expect(d?.formatted).toBe('▲ 6,2%');
  });

  it('returns null when prior is zero', () => {
    expect(formatDelta(100, 0, 'en')).toBeNull();
  });

  it('returns null when both current and prior are zero', () => {
    expect(formatDelta(0, 0, 'en')).toBeNull();
  });

  it('treats equal values as ▲ 0.0%', () => {
    const d = formatDelta(100, 100, 'en');
    expect(d?.direction).toBe('up');
    expect(d?.formatted).toBe('▲ 0.0%');
  });

  it('formats deltas across negative prior (e.g. swing back to profit)', () => {
    // Prior month was a $100 loss; this month is a $50 profit.
    // Signed change: 50 - (-100) = +150 ⇒ up.
    // Percent uses |prior|: 150 / 100 = 150%.
    const d = formatDelta(50, -100, 'en');
    expect(d?.direction).toBe('up');
    expect(d?.formatted).toBe('▲ 150.0%');
  });
});
