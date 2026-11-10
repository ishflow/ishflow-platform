import { clearRegistry, defineInformationRegister, field } from '@/platform/metadata';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  PriceTypeCycleError,
  getProductAvgCost,
  resolvePrice,
  resolvePriceForType,
} from './pricing';

const stockRegister = {
  id: 'inventory.stock_balance',
  module: 'inventory',
  name: 'stock_balance',
  kind: 'accumulation' as const,
  dimensions: { warehouse: {}, product: {} },
  resources: { quantity: {}, totalCost: {} },
};

type PriceAgreementRow = {
  id: string;
  counterparty: string | null;
  product: string | null;
  fixedPrice: number | null;
  validFrom: Date;
  validTo: Date | null;
};

type PriceTypeRow = {
  id: string;
  markupPct: number | string | null;
  isDefault?: boolean | null;
  kind?: string;
  basePriceType?: string | null;
};

type ProductPriceRow = {
  id: string;
  product: string;
  priceType: string;
  price: number;
  /** period maps to the 1C information register "period" field */
  period: Date;
  deletedAt?: Date | null;
};

function mkTx(opts: {
  movements?: Array<Record<string, unknown>>;
  specials?: PriceAgreementRow[];
  priceTypes?: PriceTypeRow[];
  productPrices?: ProductPriceRow[];
  tenant?: { defaultMarkupPct: number | null } | null;
}) {
  const priceTypes = opts.priceTypes ?? [];
  const productPrices = opts.productPrices ?? [];
  return {
    movement_inventory_stock_balance: {
      findMany: vi.fn(async () => opts.movements ?? []),
      groupBy: vi.fn(async () => []),
      count: vi.fn(async () => (opts.movements ?? []).length),
    },
    catalog_sales_price_agreement: {
      findMany: vi.fn(async () => opts.specials ?? []),
    },
    catalog_sales_price_type: {
      findFirst: vi.fn(async (args: unknown) => {
        const where = (args as { where?: { id?: string; isDefault?: boolean } } | undefined)?.where;
        if (where?.id) {
          return priceTypes.find((p) => p.id === where.id) ?? null;
        }
        if (where?.isDefault === true) {
          return priceTypes.find((p) => p.isDefault === true) ?? null;
        }
        return null;
      }),
      findUnique: vi.fn(async (args: unknown) => {
        const where = (args as { where?: { id?: string } } | undefined)?.where;
        return where?.id ? (priceTypes.find((p) => p.id === where.id) ?? null) : null;
      }),
    },
    // informationRegisterAt calls register_inventory_product_price.findFirst with:
    //   where: { deletedAt: null, period: { lte: asOf }, product, priceType }
    //   orderBy: [{ period: 'desc' }, { createdAt: 'desc' }]
    register_inventory_product_price: {
      findFirst: vi.fn(async (args: unknown) => {
        const where = (args as { where?: Record<string, unknown> } | undefined)?.where ?? {};
        const product = where.product as string | undefined;
        const priceType = where.priceType as string | undefined;
        const periodLte = (where.period as { lte?: Date } | undefined)?.lte;
        const matches = productPrices.filter((pp) => {
          if (pp.deletedAt != null) return false;
          if (product && pp.product !== product) return false;
          if (priceType && pp.priceType !== priceType) return false;
          if (periodLte && pp.period.getTime() > periodLte.getTime()) return false;
          return true;
        });
        matches.sort((a, b) => b.period.getTime() - a.period.getTime());
        return matches[0] ?? null;
      }),
    },
    tenant: {
      findUnique: vi.fn(async () => opts.tenant ?? null),
    },
  };
}

describe('getProductAvgCost', () => {
  it('returns cost=0 when no movements', async () => {
    const tx = mkTx({ movements: [] });
    // biome-ignore lint/suspicious/noExplicitAny: test stub shape
    const out = await getProductAvgCost(tx as any, stockRegister as any, 'p1');
    expect(out.cost).toBe(0);
    expect(out.quantity).toBe(0);
  });

  it('computes weighted average from income minus expense', async () => {
    const tx = mkTx({
      movements: [
        { kind: 'income', quantity: 30, totalCost: 300 },
        { kind: 'income', quantity: 50, totalCost: 600 },
        { kind: 'expense', quantity: 20, totalCost: 220 },
      ],
    });
    // biome-ignore lint/suspicious/noExplicitAny: test stub shape
    const out = await getProductAvgCost(tx as any, stockRegister as any, 'p1');
    expect(out.quantity).toBe(60);
    expect(out.cost).toBeCloseTo(680 / 60, 4);
  });
});

describe('resolvePrice', () => {
  const BASE = {
    tenantId: 't1',
    customerId: 'c1',
    productId: 'p1',
    date: new Date('2026-04-19'),
  };

  it('customer special price wins', async () => {
    const tx = mkTx({
      movements: [{ kind: 'income', quantity: 10, totalCost: 100 }],
      specials: [
        {
          id: 'sp1',
          counterparty: 'c1',
          product: 'p1',
          fixedPrice: 9.99,
          validFrom: new Date('2026-01-01'),
          validTo: null,
        },
      ],
    });
    // biome-ignore lint/suspicious/noExplicitAny: test stub shape
    const out = await resolvePrice(tx as any, stockRegister as any, BASE);
    expect(out.source).toBe('special:sp1');
    expect(out.price).toBe(9.99);
  });

  it('skips expired customer special and falls through to tenant default markup', async () => {
    const tx = mkTx({
      movements: [{ kind: 'income', quantity: 10, totalCost: 100 }],
      specials: [
        {
          id: 'sp-expired',
          counterparty: 'c1',
          product: 'p1',
          fixedPrice: 7.5,
          validFrom: new Date('2026-01-01'),
          validTo: new Date('2026-03-31'),
        },
      ],
      tenant: { defaultMarkupPct: 0.1 },
    });
    // biome-ignore lint/suspicious/noExplicitAny: test stub shape
    const out = await resolvePrice(tx as any, stockRegister as any, BASE);
    expect(out.source).toBe('tenant-default');
    expect(out.price).toBeCloseTo(11);
  });

  it('falls through to tenant default markup when no agreement and no price type', async () => {
    const tx = mkTx({
      movements: [{ kind: 'income', quantity: 10, totalCost: 100 }],
      tenant: { defaultMarkupPct: 0.1 },
    });
    // biome-ignore lint/suspicious/noExplicitAny: test stub shape
    const out = await resolvePrice(tx as any, stockRegister as any, BASE);
    expect(out.source).toBe('tenant-default');
    expect(out.price).toBeCloseTo(11);
  });

  it('cost=0 returns no-cost', async () => {
    const tx = mkTx({
      movements: [],
      specials: [],
    });
    // biome-ignore lint/suspicious/noExplicitAny: test stub shape
    const out = await resolvePrice(tx as any, stockRegister as any, BASE);
    expect(out.source).toBe('no-cost');
    expect(out.cost).toBe(0);
    expect(out.price).toBe(0);
  });

  it('invoice priceType → live-markup', async () => {
    const tx = mkTx({
      movements: [{ kind: 'income', quantity: 10, totalCost: 100 }], // avg = 10
      priceTypes: [{ id: 'pt-retail', markupPct: 0.4 }],
    });
    // biome-ignore lint/suspicious/noExplicitAny: test stub shape
    const out = await resolvePrice(tx as any, stockRegister as any, {
      ...BASE,
      priceTypeId: 'pt-retail',
    });
    expect(out.source).toBe('live-markup:pt-retail');
    expect(out.price).toBeCloseTo(14);
    expect(out.cost).toBe(10);
    expect(out.markupPct).toBeCloseTo(0.4);
  });

  it('no invoice priceType uses tenant default price type (isDefault=true)', async () => {
    const tx = mkTx({
      movements: [{ kind: 'income', quantity: 10, totalCost: 100 }],
      priceTypes: [{ id: 'pt-default', markupPct: 0.1, isDefault: true }],
    });
    // biome-ignore lint/suspicious/noExplicitAny: test stub shape
    const out = await resolvePrice(tx as any, stockRegister as any, BASE);
    expect(out.source).toBe('live-markup:pt-default');
    expect(out.price).toBeCloseTo(11);
  });

  it('price type exists but cost=0 returns no-cost', async () => {
    const tx = mkTx({
      movements: [],
      priceTypes: [{ id: 'pt-retail', markupPct: 0.4 }],
    });
    // biome-ignore lint/suspicious/noExplicitAny: test stub shape
    const out = await resolvePrice(tx as any, stockRegister as any, {
      ...BASE,
      priceTypeId: 'pt-retail',
    });
    expect(out.source).toBe('no-cost');
    expect(out.price).toBe(0);
  });
});

function registerProductPriceReg(): void {
  defineInformationRegister({
    module: 'inventory',
    name: 'product_price',
    label: { en: 'Product Prices', ru: 'Цены номенклатуры', tr: 'Ürün Fiyatları' },
    pluralLabel: { en: 'Product Prices', ru: 'Цены номенклатуры', tr: 'Ürün Fiyatları' },
    icon: 'Tag',
    periodicity: 'date',
    dimensions: {
      product: field.reference({
        label: { en: 'Product', ru: 'Товар', tr: 'Ürün' },
        required: true,
        to: { kind: 'ref', module: 'inventory', name: 'product' },
      }),
      priceType: field.reference({
        label: { en: 'Price Type', ru: 'Тип цен', tr: 'Fiyat Türü' },
        required: true,
        to: { kind: 'ref', module: 'sales', name: 'price_type' },
      }),
    },
    resources: {
      price: field.money({
        label: { en: 'Price', ru: 'Цена', tr: 'Fiyat' },
        required: true,
      }),
    },
    recorder: { module: 'inventory', name: 'price_setting' },
    permissions: { read: 'any' },
    listColumnOrder: ['period', 'product', 'priceType', 'price'],
  });
}

describe('resolvePrice — stored/derived layer', () => {
  beforeEach(() => {
    clearRegistry();
    registerProductPriceReg();
  });
  afterEach(() => {
    clearRegistry();
  });

  const BASE2 = {
    tenantId: 't1',
    customerId: 'c1',
    productId: 'p1',
    date: new Date('2026-04-19'),
  };

  it('static price type: returns stored product_price with source=stored:<id>', async () => {
    const tx = mkTx({
      movements: [{ kind: 'income', quantity: 10, totalCost: 100 }],
      priceTypes: [{ id: 'pt-static', kind: 'static', basePriceType: null, markupPct: null }],
      productPrices: [
        {
          id: 'pp1',
          product: 'p1',
          priceType: 'pt-static',
          price: 42,
          period: new Date('2026-01-01'),
        },
      ],
    });
    // biome-ignore lint/suspicious/noExplicitAny: test stub shape
    const out = await resolvePrice(tx as any, stockRegister as any, {
      ...BASE2,
      priceTypeId: 'pt-static',
    });
    expect(out.source).toBe('stored:pt-static');
    expect(out.price).toBe(42);
  });

  it('dynamic price type: returns derived price with source=derived:<id>', async () => {
    const tx = mkTx({
      movements: [{ kind: 'income', quantity: 10, totalCost: 100 }],
      priceTypes: [
        { id: 'pt-static', kind: 'static', basePriceType: null, markupPct: null },
        { id: 'pt-dyn', kind: 'dynamic', basePriceType: 'pt-static', markupPct: 0.3 },
      ],
      productPrices: [
        {
          id: 'pp1',
          product: 'p1',
          priceType: 'pt-static',
          price: 100,
          period: new Date('2026-01-01'),
        },
      ],
    });
    // biome-ignore lint/suspicious/noExplicitAny: test stub shape
    const out = await resolvePrice(tx as any, stockRegister as any, {
      ...BASE2,
      priceTypeId: 'pt-dyn',
    });
    expect(out.source).toBe('derived:pt-dyn');
    expect(out.price).toBe(130);
    expect(out.markupPct).toBeCloseTo(0.3);
  });

  it('dynamic chain with no stored base → falls back to live-markup layer', async () => {
    const tx = mkTx({
      movements: [{ kind: 'income', quantity: 10, totalCost: 100 }],
      priceTypes: [
        { id: 'pt-static', kind: 'static', basePriceType: null, markupPct: null },
        { id: 'pt-dyn', kind: 'dynamic', basePriceType: 'pt-static', markupPct: 0.3 },
      ],
      productPrices: [], // no stored price — dynamic can't resolve
    });
    // biome-ignore lint/suspicious/noExplicitAny: test stub shape
    const out = await resolvePrice(tx as any, stockRegister as any, {
      ...BASE2,
      priceTypeId: 'pt-dyn',
    });
    // Falls to legacy live-markup (cost × markup) — pt-dyn's markup 0.3 → 10*1.3 = 13
    expect(out.source).toBe('live-markup:pt-dyn');
    expect(out.price).toBeCloseTo(13);
  });
});

describe('resolvePriceForType (static/dynamic)', () => {
  beforeEach(() => {
    clearRegistry();
    registerProductPriceReg();
  });
  afterEach(() => {
    clearRegistry();
  });

  it('static kind: returns stored product_price', async () => {
    const tx = mkTx({
      priceTypes: [{ id: 'pt-static', kind: 'static', basePriceType: null, markupPct: null }],
      productPrices: [
        {
          id: 'pp1',
          product: 'p1',
          priceType: 'pt-static',
          price: 42,
          period: new Date('2026-01-01'),
        },
      ],
    });
    const result = await resolvePriceForType(
      // biome-ignore lint/suspicious/noExplicitAny: test stub shape
      tx as any,
      't1',
      'p1',
      new Date('2026-04-01'),
      'pt-static',
      new Set(),
    );
    expect(result).toBe(42);
  });

  it('dynamic kind: resolves base × (1 + markup)', async () => {
    const tx = mkTx({
      priceTypes: [
        { id: 'pt-static', kind: 'static', basePriceType: null, markupPct: null },
        { id: 'pt-dyn', kind: 'dynamic', basePriceType: 'pt-static', markupPct: 0.3 },
      ],
      productPrices: [
        {
          id: 'pp1',
          product: 'p1',
          priceType: 'pt-static',
          price: 100,
          period: new Date('2026-01-01'),
        },
      ],
    });
    const result = await resolvePriceForType(
      // biome-ignore lint/suspicious/noExplicitAny: test stub shape
      tx as any,
      't1',
      'p1',
      new Date('2026-04-01'),
      'pt-dyn',
      new Set(),
    );
    expect(result).toBe(130);
  });

  it('dynamic-of-dynamic: chain resolves correctly', async () => {
    const tx = mkTx({
      priceTypes: [
        { id: 'pt-static', kind: 'static', basePriceType: null, markupPct: null },
        { id: 'pt-a', kind: 'dynamic', basePriceType: 'pt-static', markupPct: 0.3 },
        { id: 'pt-b', kind: 'dynamic', basePriceType: 'pt-a', markupPct: 0.5 },
      ],
      productPrices: [
        {
          id: 'pp1',
          product: 'p1',
          priceType: 'pt-static',
          price: 100,
          period: new Date('2026-01-01'),
        },
      ],
    });
    const result = await resolvePriceForType(
      // biome-ignore lint/suspicious/noExplicitAny: test stub shape
      tx as any,
      't1',
      'p1',
      new Date('2026-04-01'),
      'pt-b',
      new Set(),
    );
    expect(result).toBe(195);
  });

  it('cycle: throws PriceTypeCycleError', async () => {
    const tx = mkTx({
      priceTypes: [
        { id: 'pt-a', kind: 'dynamic', basePriceType: 'pt-b', markupPct: 0.1 },
        { id: 'pt-b', kind: 'dynamic', basePriceType: 'pt-a', markupPct: 0.1 },
      ],
    });
    await expect(
      resolvePriceForType(
        // biome-ignore lint/suspicious/noExplicitAny: test stub shape
        tx as any,
        't1',
        'p1',
        new Date(),
        'pt-a',
        new Set(),
      ),
    ).rejects.toBeInstanceOf(PriceTypeCycleError);
  });

  it('static without product_price row returns null', async () => {
    const tx = mkTx({
      priceTypes: [{ id: 'pt-static', kind: 'static', basePriceType: null, markupPct: null }],
    });
    const result = await resolvePriceForType(
      // biome-ignore lint/suspicious/noExplicitAny: test stub shape
      tx as any,
      't1',
      'p1',
      new Date(),
      'pt-static',
      new Set(),
    );
    expect(result).toBeNull();
  });

  it('Layer 2 static: returns latest register row at-or-before invoice date', async () => {
    const tx = mkTx({
      priceTypes: [{ id: 'pt-static', kind: 'static', basePriceType: null, markupPct: null }],
      productPrices: [
        // older row — should be superseded
        {
          id: 'pp-old',
          product: 'p1',
          priceType: 'pt-static',
          price: 50,
          period: new Date('2026-01-01'),
        },
        // newer row at-or-before invoice date 2026-04-01
        {
          id: 'pp-new',
          product: 'p1',
          priceType: 'pt-static',
          price: 75,
          period: new Date('2026-03-01'),
        },
        // future row — must NOT be returned (period > invoice date)
        {
          id: 'pp-fut',
          product: 'p1',
          priceType: 'pt-static',
          price: 999,
          period: new Date('2026-05-01'),
        },
      ],
    });
    const result = await resolvePriceForType(
      // biome-ignore lint/suspicious/noExplicitAny: test stub shape
      tx as any,
      't1',
      'p1',
      new Date('2026-04-01'),
      'pt-static',
      new Set(),
    );
    expect(result).toBe(75);
  });

  it('Layer 2 dynamic: derives base × (1+markup) recursively', async () => {
    const tx = mkTx({
      priceTypes: [
        { id: 'pt-base', kind: 'static', basePriceType: null, markupPct: null },
        { id: 'pt-dyn', kind: 'dynamic', basePriceType: 'pt-base', markupPct: 0.2 },
      ],
      productPrices: [
        {
          id: 'pp1',
          product: 'p1',
          priceType: 'pt-base',
          price: 200,
          period: new Date('2026-01-01'),
        },
      ],
    });
    const result = await resolvePriceForType(
      // biome-ignore lint/suspicious/noExplicitAny: test stub shape
      tx as any,
      't1',
      'p1',
      new Date('2026-04-01'),
      'pt-dyn',
      new Set(),
    );
    // 200 * 1.2 = 240
    expect(result).toBe(240);
  });

  it('Layer 2 dynamic missing base: returns null (falls through to Layer 3)', async () => {
    const tx = mkTx({
      priceTypes: [
        { id: 'pt-base', kind: 'static', basePriceType: null, markupPct: null },
        { id: 'pt-dyn', kind: 'dynamic', basePriceType: 'pt-base', markupPct: 0.2 },
      ],
      productPrices: [], // no row for pt-base → base resolves null → dynamic returns null
    });
    const result = await resolvePriceForType(
      // biome-ignore lint/suspicious/noExplicitAny: test stub shape
      tx as any,
      't1',
      'p1',
      new Date('2026-04-01'),
      'pt-dyn',
      new Set(),
    );
    expect(result).toBeNull();
  });

  it('Layer 2 dynamic-no-base + liveCost: returns liveCost × (1 + markup)', async () => {
    const tx = mkTx({
      priceTypes: [{ id: 'pt-dyn', kind: 'dynamic', basePriceType: null, markupPct: 0.2 }],
    });
    const result = await resolvePriceForType(
      // biome-ignore lint/suspicious/noExplicitAny: test stub shape
      tx as any,
      't1',
      'p1',
      new Date('2026-04-01'),
      'pt-dyn',
      new Set(),
      { liveCost: 10 },
    );
    // 10 * 1.2 = 12
    expect(result).toBe(12);
  });

  it('Layer 2 dynamic-no-base + no options: returns null (legacy behavior preserved)', async () => {
    const tx = mkTx({
      priceTypes: [{ id: 'pt-dyn', kind: 'dynamic', basePriceType: null, markupPct: 0.2 }],
    });
    const result = await resolvePriceForType(
      // biome-ignore lint/suspicious/noExplicitAny: test stub shape
      tx as any,
      't1',
      'p1',
      new Date('2026-04-01'),
      'pt-dyn',
      new Set(),
    );
    expect(result).toBeNull();
  });

  it('Layer 2 dynamic-no-base + liveCost=0: returns null', async () => {
    const tx = mkTx({
      priceTypes: [{ id: 'pt-dyn', kind: 'dynamic', basePriceType: null, markupPct: 0.2 }],
    });
    const result = await resolvePriceForType(
      // biome-ignore lint/suspicious/noExplicitAny: test stub shape
      tx as any,
      't1',
      'p1',
      new Date('2026-04-01'),
      'pt-dyn',
      new Set(),
      { liveCost: 0 },
    );
    expect(result).toBeNull();
  });

  it('Layer 2 dynamic chain with no-base leaf + liveCost: cascades through', async () => {
    const tx = mkTx({
      priceTypes: [
        { id: 'pt-leaf', kind: 'dynamic', basePriceType: null, markupPct: 0.2 },
        { id: 'pt-mid', kind: 'dynamic', basePriceType: 'pt-leaf', markupPct: 0.5 },
      ],
    });
    const result = await resolvePriceForType(
      // biome-ignore lint/suspicious/noExplicitAny: test stub shape
      tx as any,
      't1',
      'p1',
      new Date('2026-04-01'),
      'pt-mid',
      new Set(),
      { liveCost: 10 },
    );
    // pt-leaf: 10 * 1.2 = 12. pt-mid: 12 * 1.5 = 18
    expect(result).toBe(18);
  });

  it('Layer 2 cycle A→B→A: throws PriceTypeCycleError', async () => {
    const tx = mkTx({
      priceTypes: [
        { id: 'pt-a', kind: 'dynamic', basePriceType: 'pt-b', markupPct: 0.1 },
        { id: 'pt-b', kind: 'dynamic', basePriceType: 'pt-a', markupPct: 0.1 },
      ],
    });
    await expect(
      resolvePriceForType(
        // biome-ignore lint/suspicious/noExplicitAny: test stub shape
        tx as any,
        't1',
        'p1',
        new Date('2026-04-01'),
        'pt-a',
        new Set(),
      ),
    ).rejects.toBeInstanceOf(PriceTypeCycleError);
  });
});
