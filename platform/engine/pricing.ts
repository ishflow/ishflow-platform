import { getRegistry } from '@/platform/metadata';
import type { AccumulationRegisterConfig } from '@/platform/metadata';
import type { Prisma } from '@prisma/client';
import { informationRegisterAt } from './information-register-query';
import { registerBalanceAll } from './register-query';

export type ProductAvgCost = { cost: number; quantity: number; totalCost: number };

export async function getProductAvgCost(
  tx: unknown,
  register: AccumulationRegisterConfig,
  productId: string,
): Promise<ProductAvgCost> {
  const all = await registerBalanceAll(tx, register, { product: productId });
  const quantity = Number(all.quantity ?? 0);
  const totalCost = Number(all.totalCost ?? 0);
  const cost = quantity > 0 ? totalCost / quantity : 0;
  return { cost, quantity, totalCost };
}

type SpecialRow = {
  id: string;
  counterparty: string;
  product: string;
  fixedPrice: number | string | null;
  validFrom: Date;
  validTo: Date | null;
};

type PriceTypeRow = {
  id: string;
  markupPct: number | string | null;
};

export type PricingInput = {
  tenantId: string;
  customerId: string;
  productId: string;
  date: Date;
  priceTypeId?: string | null;
};

export type PricingResult = {
  price: number;
  cost: number;
  markupPct: number | null;
  source:
    | 'no-cost'
    | 'tenant-default'
    | `special:${string}`
    | `live-markup:${string}`
    | `stored:${string}`
    | `derived:${string}`;
};

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

export class PriceTypeCycleError extends Error {
  constructor(priceTypeId: string) {
    super(`Price type cycle detected at ${priceTypeId}`);
    this.name = 'PriceTypeCycleError';
  }
}

type PriceTypeRowExt = {
  id: string;
  kind: string;
  basePriceType: string | null;
  markupPct: Prisma.Decimal | number | string | null;
};

type PriceResolverBag = {
  catalog_sales_price_type: {
    findUnique: (a: unknown) => Promise<PriceTypeRowExt | null>;
  };
};

/**
 * Optional inputs that let callers (e.g. the mobile prices endpoint) opt into
 * the live-cost fallback for dynamic price types whose `basePriceType` is
 * null. When `liveCost` is provided and `> 0`, a dynamic-no-base type
 * resolves to `liveCost × (1 + markupPct)` instead of `null` — matching the
 * behaviour of `resolvePrice`'s Layer 2 (`live-markup`) and the pricing
 * matrix UI. Existing callers that don't pass options keep the legacy
 * "return null" semantics so source-name contracts (`derived` vs
 * `live-markup`) in `resolvePrice` are preserved.
 */
export type ResolvePriceForTypeOptions = {
  liveCost?: number;
};

export async function resolvePriceForType(
  tx: unknown,
  tenantId: string,
  productId: string,
  date: Date,
  priceTypeId: string,
  visited: Set<string>,
  options?: ResolvePriceForTypeOptions,
): Promise<number | null> {
  if (visited.has(priceTypeId)) throw new PriceTypeCycleError(priceTypeId);
  visited.add(priceTypeId);

  const bag = tx as PriceResolverBag;
  const pt = await bag.catalog_sales_price_type.findUnique({ where: { id: priceTypeId } });
  if (!pt) return null;

  if (pt.kind === 'static') {
    const reg = getRegistry().informationRegister['inventory.product_price'];
    if (!reg) return null;
    const row = await informationRegisterAt(
      tx,
      reg,
      { product: productId, priceType: priceTypeId },
      date,
    );
    return row ? Number(row.price as number | string) : null;
  }

  if (pt.kind === 'dynamic') {
    const markup = pt.markupPct === null ? 0 : Number(pt.markupPct);
    if (pt.basePriceType) {
      const basePrice = await resolvePriceForType(
        tx,
        tenantId,
        productId,
        date,
        pt.basePriceType,
        visited,
        options,
      );
      if (basePrice === null) return null;
      return round2(basePrice * (1 + markup));
    }
    // Dynamic with no base: opt-in live-cost fallback. Mirrors
    // `resolvePrice` Layer 2 (`live-markup`) and `pricing-matrix.server.tsx`
    // so a "Coca-Cola style" price type (markup over current avg cost)
    // resolves correctly through the mobile prices endpoint.
    const liveCost = options?.liveCost;
    if (liveCost !== undefined && liveCost > 0 && Number.isFinite(markup)) {
      return round2(liveCost * (1 + markup));
    }
    return null;
  }

  return null;
}

type PricingBag = {
  catalog_sales_price_agreement: { findMany: (a: unknown) => Promise<SpecialRow[]> };
  catalog_sales_price_type: {
    findFirst: (a: unknown) => Promise<PriceTypeRow | null>;
  };
  tenant: {
    findUnique: (a: unknown) => Promise<{ defaultMarkupPct: number | string | null } | null>;
  };
};

async function resolveEffectivePriceType(
  bag: Pick<PricingBag, 'catalog_sales_price_type'>,
  tenantId: string,
  invoicePriceTypeId: string | null | undefined,
): Promise<{ id: string; markupPct: number } | null> {
  const row = invoicePriceTypeId
    ? await bag.catalog_sales_price_type.findFirst({
        where: { id: invoicePriceTypeId, tenantId, deletedAt: null },
      })
    : await bag.catalog_sales_price_type.findFirst({
        where: { tenantId, isDefault: true, deletedAt: null },
      });
  if (!row || row.markupPct === null || row.markupPct === undefined) return null;
  const markup = Number(row.markupPct);
  if (!Number.isFinite(markup)) return null;
  return { id: row.id, markupPct: markup };
}

/**
 * Three-layer sale price resolver:
 *   1. Customer special price override          (special:<id>)
 *   2. Live avg cost × effective markup         (live-markup:<priceTypeId>)
 *   3. Live avg cost × tenant default markup    (tenant-default)
 *   cost = 0 collapses to 'no-cost'.
 *
 * Effective Fiyat Türü = invoice.priceType ?? tenant's default (isDefault=true)
 * price type. No snapshot layer: pricing is always computed from live cost.
 */
export async function resolvePrice(
  tx: unknown,
  stockRegister: AccumulationRegisterConfig,
  input: PricingInput,
): Promise<PricingResult> {
  const { cost } = await getProductAvgCost(tx, stockRegister, input.productId);
  const bag = tx as PricingBag;

  // Layer 1: customer special price (fixedPrice override)
  // Prisma 5.22+ rejects `fixedPrice: { not: null }`; filter nulls in JS instead.
  const specials = await bag.catalog_sales_price_agreement.findMany({
    where: {
      tenantId: input.tenantId,
      counterparty: input.customerId,
      product: input.productId,
      AND: [
        { validFrom: { lte: input.date } },
        { OR: [{ validTo: null }, { validTo: { gte: input.date } }] },
      ],
    },
    orderBy: { validFrom: 'desc' },
  });
  const activeSpecial = specials.find(
    (r) =>
      r.fixedPrice !== null &&
      r.validFrom.getTime() <= input.date.getTime() &&
      (r.validTo === null || r.validTo.getTime() >= input.date.getTime()),
  );
  if (activeSpecial && activeSpecial.fixedPrice !== null) {
    return {
      price: Number(activeSpecial.fixedPrice),
      cost,
      markupPct: null,
      source: `special:${activeSpecial.id}`,
    };
  }

  // Layer 2: stored (static) or derived (dynamic) price type
  if (input.priceTypeId) {
    const derived = await resolvePriceForType(
      tx,
      input.tenantId,
      input.productId,
      input.date,
      input.priceTypeId,
      new Set(),
    );
    if (derived !== null) {
      const pt = await (tx as PriceResolverBag).catalog_sales_price_type.findUnique({
        where: { id: input.priceTypeId },
      });
      const isDynamic = pt?.kind === 'dynamic';
      return {
        price: derived,
        cost,
        markupPct: isDynamic && pt?.markupPct !== null ? Number(pt?.markupPct ?? 0) : null,
        source: (isDynamic ? `derived:${input.priceTypeId}` : `stored:${input.priceTypeId}`) as
          | `derived:${string}`
          | `stored:${string}`,
      };
    }
  }

  const effective = await resolveEffectivePriceType(bag, input.tenantId, input.priceTypeId);

  // Layer 2: live avg cost × effective markup
  if (effective && cost > 0) {
    return {
      price: round2(cost * (1 + effective.markupPct)),
      cost,
      markupPct: effective.markupPct,
      source: `live-markup:${effective.id}`,
    };
  }

  // Layer 3: tenant default markup
  if (cost <= 0) {
    return { price: 0, cost: 0, markupPct: null, source: 'no-cost' };
  }
  const tenantRow = await bag.tenant.findUnique({ where: { id: input.tenantId } });
  const defaultMarkup = Number(tenantRow?.defaultMarkupPct ?? 0.1);
  return {
    price: round2(cost * (1 + defaultMarkup)),
    cost,
    markupPct: defaultMarkup,
    source: 'tenant-default',
  };
}
