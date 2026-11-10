import { describe, expect, it } from 'vitest';
import {
  type ProductCandidate,
  type SupplierCandidate,
  matchProductFromCandidates,
  matchSupplierFromCandidates,
  normalizeName,
  tokenOverlap,
  tokenize,
} from './match';

describe('normalizeName', () => {
  it('lowercases, trims, and collapses whitespace', () => {
    expect(normalizeName('  ООО  Ромашка ')).toBe('ооо ромашка');
    expect(normalizeName('Acme  Corp.')).toBe('acme corp.');
  });
});

describe('tokenize', () => {
  it('drops 1-character tokens and punctuation', () => {
    expect(tokenize('а конфеты-карамель, 100 г')).toEqual(['конфеты', 'карамель', '100']);
  });

  it('handles cyrillic + latin mixes', () => {
    expect(tokenize('iPhone 15 Pro, 256ГБ')).toEqual(['iphone', '15', 'pro', '256гб']);
  });
});

describe('tokenOverlap', () => {
  it('returns 1 for identical strings', () => {
    expect(tokenOverlap('конфеты карамель', 'Конфеты Карамель')).toBe(1);
  });

  it('returns >= 0.6 for a 2-of-3 overlap', () => {
    expect(tokenOverlap('конфеты карамель 100', 'конфеты карамель')).toBeGreaterThanOrEqual(0.6);
  });

  it('returns 0 when either input has no tokens', () => {
    expect(tokenOverlap('', 'конфеты')).toBe(0);
    expect(tokenOverlap('конфеты', '')).toBe(0);
  });

  it('is symmetric', () => {
    expect(tokenOverlap('a b c', 'b c d')).toBe(tokenOverlap('b c d', 'a b c'));
  });
});

describe('matchSupplierFromCandidates', () => {
  const candidates: SupplierCandidate[] = [
    { id: 'sup-1', name: 'ООО Ромашка' },
    { id: 'sup-2', name: 'ИП Иванов' },
    { id: 'sup-3', name: 'Acme Corp' },
  ];

  it('matches case-insensitively on exact name', () => {
    expect(
      matchSupplierFromCandidates({ supplierName: 'ооо ромашка', supplierInn: null }, candidates),
    ).toEqual({ id: 'sup-1', name: 'ООО Ромашка' });
  });

  it('returns null when name does not match any candidate', () => {
    expect(
      matchSupplierFromCandidates({ supplierName: 'Beta GmbH', supplierInn: null }, candidates),
    ).toBeNull();
  });

  it('returns null when supplierName is missing', () => {
    expect(
      matchSupplierFromCandidates({ supplierName: null, supplierInn: '7707083893' }, candidates),
    ).toBeNull();
  });

  it('returns null on empty supplierName', () => {
    expect(
      matchSupplierFromCandidates({ supplierName: '   ', supplierInn: null }, candidates),
    ).toBeNull();
  });
});

describe('matchProductFromCandidates', () => {
  const products: ProductCandidate[] = [
    { id: 'p-1', name: 'Конфеты карамель', code: 'A-001' },
    { id: 'p-2', name: 'Шоколад горький 100г', code: 'A-002' },
    { id: 'p-3', name: 'iPhone 15 Pro 256GB', code: 'A-003' },
  ];

  it('matches case-insensitively on exact description', () => {
    expect(matchProductFromCandidates('КОНФЕТЫ КАРАМЕЛЬ', products)).toEqual(products[0]);
  });

  it('matches via 60% token overlap when no exact match exists', () => {
    // 2 of 3 tokens overlap (shared / max = 2/3 ≈ 0.67)
    expect(matchProductFromCandidates('конфеты карамель премиум', products)).toEqual(products[0]);
  });

  it('returns null when token overlap is below the threshold', () => {
    // 1 of 4 tokens overlap (1/4 = 0.25 < 0.6)
    expect(matchProductFromCandidates('конфеты молочные шоколадные премиум', products)).toBeNull();
  });

  it('returns null on empty description', () => {
    expect(matchProductFromCandidates('', products)).toBeNull();
  });

  it('prefers the higher-scoring overlap when multiple candidates qualify', () => {
    const subset: ProductCandidate[] = [
      { id: 'a', name: 'apple banana cherry', code: '1' },
      { id: 'b', name: 'apple banana', code: '2' },
    ];
    // "apple banana" → both candidates have 2 shared tokens; the one with
    // smaller `max(|A|,|B|)` (= b's exact name) scores higher.
    const result = matchProductFromCandidates('apple banana', subset);
    expect(result?.id).toBe('b');
  });
});
