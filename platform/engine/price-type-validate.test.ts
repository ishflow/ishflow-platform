import { describe, expect, it } from 'vitest';
import { type PriceTypeLookup, validatePriceTypeWrite } from './price-type-validate';

function mkLookup(chain: Record<string, { basePriceType: string | null }>): PriceTypeLookup {
  return async (id: string) => chain[id] ?? null;
}

describe('validatePriceTypeWrite', () => {
  it('rejects invalid kind', async () => {
    const err = await validatePriceTypeWrite(
      mkLookup({}),
      { kind: 'other', basePriceType: null, markupPct: null },
      null,
    );
    expect(err).toBe('priceType.errors.invalidKind');
  });

  it('static OK with no base/markup', async () => {
    const err = await validatePriceTypeWrite(
      mkLookup({}),
      { kind: 'static', basePriceType: null, markupPct: null },
      null,
    );
    expect(err).toBeNull();
  });

  it('static rejects basePriceType set', async () => {
    const err = await validatePriceTypeWrite(
      mkLookup({}),
      { kind: 'static', basePriceType: 'pt-base', markupPct: null },
      null,
    );
    expect(err).toBe('priceType.errors.baseForbiddenForStatic');
  });

  it('dynamic OK with no basePriceType (live cost-based markup)', async () => {
    // Dynamic + null base + markup means the resolver computes
    // `avgCost × (1 + markup)` from the stock register at sale time.
    // Tracks the latest weighted average cost automatically.
    const err = await validatePriceTypeWrite(
      mkLookup({}),
      { kind: 'dynamic', basePriceType: null, markupPct: 10 },
      null,
    );
    expect(err).toBeNull();
  });

  it('dynamic OK with empty-string basePriceType (treated as null)', async () => {
    const err = await validatePriceTypeWrite(
      mkLookup({}),
      { kind: 'dynamic', basePriceType: '', markupPct: 10 },
      null,
    );
    expect(err).toBeNull();
  });

  it('dynamic rejects missing markup', async () => {
    const err = await validatePriceTypeWrite(
      mkLookup({ 'pt-base': { basePriceType: null } }),
      { kind: 'dynamic', basePriceType: 'pt-base', markupPct: null },
      null,
    );
    expect(err).toBe('priceType.errors.markupRequiredForDynamic');
  });

  it('dynamic OK with base + markup', async () => {
    const err = await validatePriceTypeWrite(
      mkLookup({ 'pt-base': { basePriceType: null } }),
      { kind: 'dynamic', basePriceType: 'pt-base', markupPct: 30 },
      null,
    );
    expect(err).toBeNull();
  });

  it('dynamic rejects self-reference (on update)', async () => {
    const err = await validatePriceTypeWrite(
      mkLookup({ 'pt-a': { basePriceType: null } }),
      { kind: 'dynamic', basePriceType: 'pt-a', markupPct: 10 },
      'pt-a',
    );
    expect(err).toBe('priceType.errors.selfReference');
  });

  it('dynamic rejects indirect cycle A→B→A', async () => {
    // We are editing pt-a. Setting base=pt-b means A→B; lookup sees B→A → cycle.
    const err = await validatePriceTypeWrite(
      mkLookup({
        'pt-b': { basePriceType: 'pt-a' },
      }),
      { kind: 'dynamic', basePriceType: 'pt-b', markupPct: 10 },
      'pt-a',
    );
    expect(err).toBe('priceType.errors.cycleDetected');
  });

  it('dynamic handles chain of 3 with no cycle', async () => {
    const err = await validatePriceTypeWrite(
      mkLookup({
        'pt-x': { basePriceType: 'pt-y' },
        'pt-y': { basePriceType: 'pt-z' },
        'pt-z': { basePriceType: null },
      }),
      { kind: 'dynamic', basePriceType: 'pt-x', markupPct: 10 },
      'pt-new',
    );
    expect(err).toBeNull();
  });
});
