import { describe, expect, it } from 'vitest';
import { type PeriodLabel, resolvePeriod } from './period';

const FIXED_NOW = new Date('2026-05-11T22:00:00Z'); // Monday, May 11, 2026

describe('resolvePeriod', () => {
  it('this-week starts on Monday (ISO week)', () => {
    const p = resolvePeriod('this-week', FIXED_NOW);
    expect(p.from.toISOString()).toBe('2026-05-11T00:00:00.000Z');
    expect(p.to.toISOString()).toBe('2026-05-11T22:00:00.000Z');
  });

  it('this-month starts on day 1', () => {
    const p = resolvePeriod('this-month', FIXED_NOW);
    expect(p.from.toISOString()).toBe('2026-05-01T00:00:00.000Z');
  });

  it('this-quarter starts on Apr 1 for May', () => {
    const p = resolvePeriod('this-quarter', FIXED_NOW);
    expect(p.from.toISOString()).toBe('2026-04-01T00:00:00.000Z');
  });

  it('this-year starts on Jan 1', () => {
    const p = resolvePeriod('this-year', FIXED_NOW);
    expect(p.from.toISOString()).toBe('2026-01-01T00:00:00.000Z');
  });

  it('prior period covers the previous full calendar unit and ends right before this.from', () => {
    const p = resolvePeriod('this-month', FIXED_NOW);
    expect(p.priorFrom.toISOString()).toBe('2026-04-01T00:00:00.000Z');
    expect(p.priorTo.getTime()).toBeLessThan(p.from.getTime());
    expect(p.priorTo.toISOString()).toBe('2026-04-30T23:59:59.999Z');
  });

  it('rejects unknown labels', () => {
    expect(() => resolvePeriod('forever' as PeriodLabel, FIXED_NOW)).toThrow();
  });
});

describe('resolvePeriod — calendar rollovers', () => {
  const JAN_1 = new Date('2026-01-01T12:00:00Z'); // Thursday

  it('this-month rolls back to previous December', () => {
    const p = resolvePeriod('this-month', JAN_1);
    expect(p.from.toISOString()).toBe('2026-01-01T00:00:00.000Z');
    expect(p.priorFrom.toISOString()).toBe('2025-12-01T00:00:00.000Z');
    expect(p.priorTo.toISOString()).toBe('2025-12-31T23:59:59.999Z');
  });

  it('this-quarter Q1 rolls back to previous Q4', () => {
    const p = resolvePeriod('this-quarter', JAN_1);
    expect(p.from.toISOString()).toBe('2026-01-01T00:00:00.000Z');
    expect(p.priorFrom.toISOString()).toBe('2025-10-01T00:00:00.000Z');
    expect(p.priorTo.toISOString()).toBe('2025-12-31T23:59:59.999Z');
  });

  it('this-year rolls back to previous full year', () => {
    const p = resolvePeriod('this-year', JAN_1);
    expect(p.priorFrom.toISOString()).toBe('2025-01-01T00:00:00.000Z');
    expect(p.priorTo.toISOString()).toBe('2025-12-31T23:59:59.999Z');
  });

  it('this-week handles Sunday (day=0) correctly', () => {
    const sun = new Date('2026-05-10T12:00:00Z'); // Sunday
    const p = resolvePeriod('this-week', sun);
    expect(p.from.toISOString()).toBe('2026-05-04T00:00:00.000Z'); // prior Monday
    expect(p.priorFrom.toISOString()).toBe('2026-04-27T00:00:00.000Z');
  });
});
