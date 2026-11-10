import { describe, expect, it } from 'vitest';
import { parseRegisterPeriod, serializeRegisterPeriod } from './parse-register-period';

describe('parseRegisterPeriod', () => {
  const fixedNow = new Date(Date.UTC(2026, 4, 20)); // 2026-05-20

  it('returns current month when param is undefined', () => {
    const p = parseRegisterPeriod(undefined, fixedNow);
    expect(p.kind).toBe('month');
    if (p.kind === 'month') {
      expect(p.year).toBe(2026);
      expect(p.month).toBe(5);
      expect(p.start.toISOString()).toBe('2026-05-01T00:00:00.000Z');
      expect(p.end.toISOString()).toBe('2026-06-01T00:00:00.000Z');
    }
  });

  it('parses month form 2026-05', () => {
    const p = parseRegisterPeriod('2026-05', fixedNow);
    expect(p.kind).toBe('month');
    if (p.kind === 'month') {
      expect(p.year).toBe(2026);
      expect(p.month).toBe(5);
    }
  });

  it('parses day form 2026-05-16', () => {
    const p = parseRegisterPeriod('2026-05-16', fixedNow);
    expect(p.kind).toBe('day');
    if (p.kind === 'day') {
      expect(p.date.toISOString()).toBe('2026-05-16T00:00:00.000Z');
      expect(p.end.toISOString()).toBe('2026-05-17T00:00:00.000Z');
    }
  });

  it('parses range form 2026-05_2026-07 (end month inclusive)', () => {
    const p = parseRegisterPeriod('2026-05_2026-07', fixedNow);
    expect(p.kind).toBe('range');
    if (p.kind === 'range') {
      expect(p.start.toISOString()).toBe('2026-05-01T00:00:00.000Z');
      expect(p.end.toISOString()).toBe('2026-08-01T00:00:00.000Z');
    }
  });

  it('parses day-range form 2026-05-16_2026-07-20 (end day inclusive)', () => {
    const p = parseRegisterPeriod('2026-05-16_2026-07-20', fixedNow);
    expect(p.kind).toBe('range');
    if (p.kind === 'range') {
      expect(p.start.toISOString()).toBe('2026-05-16T00:00:00.000Z');
      expect(p.end.toISOString()).toBe('2026-07-21T00:00:00.000Z');
    }
  });

  it('falls back to current month for garbage input', () => {
    const p = parseRegisterPeriod('not-a-period', fixedNow);
    expect(p.kind).toBe('month');
    if (p.kind === 'month') expect(p.month).toBe(5);
  });

  it('rejects impossible month and falls back', () => {
    const p = parseRegisterPeriod('2026-13', fixedNow);
    expect(p.kind).toBe('month');
    if (p.kind === 'month') expect(p.month).toBe(5);
  });

  it('rejects reversed range and falls back', () => {
    const p = parseRegisterPeriod('2026-07_2026-05', fixedNow);
    expect(p.kind).toBe('month');
  });
});

describe('serializeRegisterPeriod', () => {
  it('serializes month back to YYYY-MM', () => {
    const p = parseRegisterPeriod('2026-05', new Date());
    expect(serializeRegisterPeriod(p)).toBe('2026-05');
  });

  it('serializes day back to YYYY-MM-DD', () => {
    const p = parseRegisterPeriod('2026-05-16', new Date());
    expect(serializeRegisterPeriod(p)).toBe('2026-05-16');
  });

  it('serializes range back to YYYY-MM_YYYY-MM (inclusive end)', () => {
    const p = parseRegisterPeriod('2026-05_2026-07', new Date());
    expect(serializeRegisterPeriod(p)).toBe('2026-05_2026-07');
  });

  it('serializes a day-level range back to YYYY-MM-DD_YYYY-MM-DD (inclusive end)', () => {
    const p = parseRegisterPeriod('2026-05-16_2026-07-20', new Date());
    expect(serializeRegisterPeriod(p)).toBe('2026-05-16_2026-07-20');
  });
});
