export type PriceTypeLookup = (id: string) => Promise<{ basePriceType: string | null } | null>;

export type PriceTypeBody = {
  kind?: unknown;
  basePriceType?: unknown;
  markupPct?: unknown;
};

export async function validatePriceTypeWrite(
  lookup: PriceTypeLookup,
  body: PriceTypeBody,
  currentId: string | null,
): Promise<string | null> {
  const kind = body.kind;
  const base =
    body.basePriceType === undefined || body.basePriceType === '' ? null : body.basePriceType;
  const markup = body.markupPct === undefined ? null : body.markupPct;

  if (kind !== 'static' && kind !== 'dynamic') {
    return 'priceType.errors.invalidKind';
  }

  if (kind === 'static') {
    if (base !== null) return 'priceType.errors.baseForbiddenForStatic';
    return null;
  }

  // dynamic
  // markup is always required (it's the % we apply to the resolved base or
  // to the live avg cost)
  if (markup === null || markup === undefined || markup === '') {
    return 'priceType.errors.markupRequiredForDynamic';
  }

  // base is OPTIONAL on dynamic. When omitted, the resolver's live-markup
  // layer (`pricing.ts:resolvePrice`) computes `avgCost × (1 + markup)`
  // directly — useful for products whose sale price should always track
  // the latest weighted average purchase cost. When provided, the resolver
  // walks the chain via `resolvePriceForType`. We still cycle-check + reject
  // self-reference if a base is given.
  if (base !== null) {
    if (typeof base !== 'string' || base.length === 0) {
      return 'priceType.errors.baseRequiredForDynamic';
    }
    if (currentId && base === currentId) {
      return 'priceType.errors.selfReference';
    }

    const visited = new Set<string>();
    let cursor: string | null = base;
    while (cursor) {
      if (currentId && cursor === currentId) {
        return 'priceType.errors.cycleDetected';
      }
      if (visited.has(cursor)) {
        return 'priceType.errors.cycleDetected';
      }
      visited.add(cursor);
      const row = await lookup(cursor);
      if (!row) break;
      cursor = row.basePriceType;
    }
  }

  return null;
}
