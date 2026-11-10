import type { Prisma } from '@prisma/client';
import { describe, expect, it } from 'vitest';
import { type TaxSettings, computeVat, resolveTaxSettings } from './tax';

describe('computeVat', () => {
  it('returns 0 when disabled (even with a rate)', () => {
    expect(computeVat(1000, { enabled: false, ratePct: 18 })).toBe(0);
  });
  it('returns 0 when rate is 0', () => {
    expect(computeVat(1000, { enabled: true, ratePct: 0 })).toBe(0);
  });
  it('computes exclusive VAT rounded to 2dp', () => {
    expect(computeVat(1000, { enabled: true, ratePct: 18 })).toBe(180);
    expect(computeVat(1000, { enabled: true, ratePct: 12 })).toBe(120);
    expect(computeVat(99.99, { enabled: true, ratePct: 12 })).toBe(12); // 11.9988 → 12.00
  });
});

describe('resolveTaxSettings', () => {
  const fakeTx = (payload: Record<string, unknown> | null) =>
    ({
      tenantSettings: { findFirst: async () => (payload ? { payload } : null) },
    }) as unknown as Prisma.TransactionClient;

  it('defaults to disabled/0 when no settings row exists', async () => {
    expect(await resolveTaxSettings(fakeTx(null))).toEqual<TaxSettings>({
      enabled: false,
      ratePct: 0,
    });
  });
  it('parses enabled + rate', async () => {
    expect(
      await resolveTaxSettings(fakeTx({ taxEnabled: true, defaultTaxRatePct: 18 })),
    ).toEqual<TaxSettings>({ enabled: true, ratePct: 18 });
  });
  it('is disabled when taxEnabled is false regardless of rate', async () => {
    expect(
      await resolveTaxSettings(fakeTx({ taxEnabled: false, defaultTaxRatePct: 18 })),
    ).toEqual<TaxSettings>({ enabled: false, ratePct: 18 });
  });
  it('coerces a string rate and floors invalid to 0', async () => {
    expect(
      await resolveTaxSettings(fakeTx({ taxEnabled: true, defaultTaxRatePct: '20' })),
    ).toEqual<TaxSettings>({ enabled: true, ratePct: 20 });
    expect(
      await resolveTaxSettings(fakeTx({ taxEnabled: true, defaultTaxRatePct: 'abc' })),
    ).toEqual<TaxSettings>({ enabled: true, ratePct: 0 });
  });
});
