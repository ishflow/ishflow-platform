import { describe, expect, it } from 'vitest';
import { deriveExternalId, innMatches, normalizeName, tokenOverlap } from './normalize';

describe('normalizeName', () => {
  it('lowercases and strips punctuation', () => {
    expect(normalizeName('Ромашка ООО')).toEqual(['ромашка']);
  });

  it('drops standalone company form prefixes (RU + EN + KZ)', () => {
    expect(normalizeName('OOO Лютик')).toEqual(['лютик']);
    expect(normalizeName('LLC Foo Corp')).toEqual(['foo']);
    expect(normalizeName('TOO Sary Arka')).toEqual(['sary', 'arka']);
  });

  it('strips quotes commonly wrapping legal names', () => {
    expect(normalizeName('ООО "Ромашка"')).toEqual(['ромашка']);
    expect(normalizeName('ООО «Лютик»')).toEqual(['лютик']);
  });

  it('drops purely numeric tokens', () => {
    expect(normalizeName('Магазин 24 на углу')).toEqual(['магазин', 'на', 'углу']);
  });

  it('returns empty array for null / undefined / empty input', () => {
    expect(normalizeName(null)).toEqual([]);
    expect(normalizeName(undefined)).toEqual([]);
    expect(normalizeName('   ')).toEqual([]);
  });
});

describe('tokenOverlap', () => {
  it('returns 1.0 for identical bags', () => {
    expect(tokenOverlap(['foo', 'bar'], ['foo', 'bar'])).toBe(1);
  });

  it('returns 0 when either side is empty', () => {
    expect(tokenOverlap([], ['foo'])).toBe(0);
    expect(tokenOverlap(['foo'], [])).toBe(0);
  });

  it('returns Jaccard ratio for partial overlap', () => {
    // shared 1, union 3 → 1/3
    expect(tokenOverlap(['foo', 'bar'], ['bar', 'baz'])).toBeCloseTo(1 / 3, 5);
  });

  it('crosses 0.6 threshold for "Ромашка ООО" vs "Ромашка"', () => {
    const a = normalizeName('Ромашка ООО');
    const b = normalizeName('Ромашка');
    expect(tokenOverlap(a, b)).toBeGreaterThanOrEqual(0.6);
  });
});

describe('innMatches', () => {
  it('strips non-digits', () => {
    expect(innMatches('INN 7707083893', '7707083893')).toBe(true);
  });

  it('returns false when either side is empty', () => {
    expect(innMatches(null, '7707083893')).toBe(false);
    expect(innMatches('7707083893', '')).toBe(false);
  });

  it('returns false on mismatch', () => {
    expect(innMatches('7707083893', '7707083894')).toBe(false);
  });
});

describe('deriveExternalId', () => {
  it('is stable for the same inputs', () => {
    const a = deriveExternalId({
      valueDate: new Date('2026-05-01'),
      amount: 100,
      direction: 'in',
      narrative: 'foo',
      counterpartyAccount: '40702',
      index: 0,
    });
    const b = deriveExternalId({
      valueDate: new Date('2026-05-01'),
      amount: 100,
      direction: 'in',
      narrative: 'foo',
      counterpartyAccount: '40702',
      index: 0,
    });
    expect(a).toBe(b);
  });

  it('differs when the index differs (disambiguation for duplicate rows)', () => {
    const a = deriveExternalId({
      valueDate: new Date('2026-05-01'),
      amount: 100,
      direction: 'in',
      narrative: 'foo',
      counterpartyAccount: '40702',
      index: 0,
    });
    const b = deriveExternalId({
      valueDate: new Date('2026-05-01'),
      amount: 100,
      direction: 'in',
      narrative: 'foo',
      counterpartyAccount: '40702',
      index: 1,
    });
    expect(a).not.toBe(b);
  });
});
