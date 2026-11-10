import { describe, expect, it, vi } from 'vitest';

vi.mock('./exporters', async (importOriginal) => {
  const actual = await importOriginal<typeof import('./exporters')>();
  return {
    ...actual,
    fetchARAgingRows: vi.fn(),
    fetchAPAgingRows: vi.fn(),
    fetchSalesByCustomerRows: vi.fn(),
    fetchSalesByProductRows: vi.fn(),
  };
});

import type { AppContext } from '@/platform/auth/current-context';
import {
  fetchAPAgingRows,
  fetchARAgingRows,
  fetchSalesByCustomerRows,
  fetchSalesByProductRows,
} from './exporters';
import { computeSummary } from './summary';

const tenantCtx = {
  tenant: { id: 't1', currency: 'USD' },
  user: { id: 'u1' },
  membership: { id: 'm1' },
  permissions: new Set(['*:*', 'reports:read']),
  scopesByEntity: new Map(),
} as unknown as AppContext;

const fixtureRows = {
  // [name, balance, current, 31-60, 61-90, 91-120, 120+]
  ar: [
    ['Ulugbek Trading', '433401.00', '0.00', '433401.00', '0.00', '0.00', '0.00'],
    ['Test Customer', '59314.40', '59314.40', '0.00', '0.00', '0.00', '0.00'],
    ['Pivot Ltd', '12000.00', '0.00', '0.00', '0.00', '6000.00', '6000.00'], // 90+
  ],
  ap: [
    ['Acme Supply', '88200.00', '0.00', '0.00', '88200.00', '0.00', '0.00'], // 61-90
    ['CityFreight', '12100.00', '12100.00', '0.00', '0.00', '0.00', '0.00'],
  ],
};

describe('computeSummary dispatcher', () => {
  it('throws on unknown type', async () => {
    await expect(
      // @ts-expect-error intentional bad input
      computeSummary('unknown-type', 'this-month', tenantCtx),
    ).rejects.toThrow(/Unknown report type/);
  });
});

describe('computeSummary — ar-aging', () => {
  it('hero=sum of balances; breakdown top-N with bucket; delta flat null', async () => {
    (fetchARAgingRows as unknown as ReturnType<typeof vi.fn>).mockResolvedValue({
      headers: [],
      rows: fixtureRows.ar,
      filenameSuffix: '2026-05-11',
    });
    const s = await computeSummary('ar-aging', 'this-month', tenantCtx);
    expect(s.type).toBe('ar-aging');
    expect(s.currency).toBe('USD');
    expect(s.hero.value).toBeCloseTo(433401 + 59314.4 + 12000, 2);
    expect(s.hero.deltaPct).toBeNull();
    expect(s.hero.deltaSign).toBe('flat');
    expect(s.breakdown).toHaveLength(3);
    expect(s.breakdown[0]?.label).toBe('Ulugbek Trading');
    expect(s.breakdown[0]?.meta?.bucket).toBe('31-60');
    expect(s.breakdown.find((b) => b.label === 'Pivot Ltd')?.meta?.bucket).toBe('90+');
    expect(s.breakdown.find((b) => b.label === 'Test Customer')?.meta?.bucket).toBe('0-30');
  });

  it('breakdown capped at 10 items', async () => {
    const many = Array.from({ length: 25 }, (_, i) => [
      `Cust ${i}`,
      `${(25 - i) * 1000}.00`,
      `${(25 - i) * 1000}.00`,
      '0.00',
      '0.00',
      '0.00',
      '0.00',
    ]);
    (fetchARAgingRows as unknown as ReturnType<typeof vi.fn>).mockResolvedValue({
      headers: [],
      rows: many,
      filenameSuffix: 'x',
    });
    const s = await computeSummary('ar-aging', 'this-month', tenantCtx);
    expect(s.breakdown).toHaveLength(10);
    expect(s.breakdown[0]?.label).toBe('Cust 0'); // highest
  });
});

describe('computeSummary — ap-aging', () => {
  it('uses the same shape with supplier names', async () => {
    (fetchAPAgingRows as unknown as ReturnType<typeof vi.fn>).mockResolvedValue({
      headers: [],
      rows: fixtureRows.ap,
      filenameSuffix: '2026-05-11',
    });
    const s = await computeSummary('ap-aging', 'this-month', tenantCtx);
    expect(s.type).toBe('ap-aging');
    expect(s.hero.value).toBeCloseTo(88200 + 12100, 2);
    expect(s.hero.deltaPct).toBeNull();
    expect(s.breakdown).toHaveLength(2);
    expect(s.breakdown[0]?.label).toBe('Acme Supply');
    expect(s.breakdown[0]?.meta?.bucket).toBe('61-90');
  });
});

describe('computeSummary — sales-by-customer', () => {
  it('hero=sum of revenue; delta vs prior period; top-10 by revenue', async () => {
    const cur = [
      // [name, revenue, cost, margin, marginPct, quantity]
      ['Acme', '10000.00', '6000.00', '4000.00', '40.00', 12],
      ['BetaCo', '4500.00', '3000.00', '1500.00', '33.33', 9],
    ];
    const prev = [['Acme', '8000.00', '5000.00', '3000.00', '37.50', 10]];
    (fetchSalesByCustomerRows as unknown as ReturnType<typeof vi.fn>)
      .mockResolvedValueOnce({ headers: [], rows: cur, filenameSuffix: 'x' })
      .mockResolvedValueOnce({ headers: [], rows: prev, filenameSuffix: 'y' });

    const s = await computeSummary('sales-by-customer', 'this-month', tenantCtx);
    expect(s.type).toBe('sales-by-customer');
    expect(s.hero.value).toBeCloseTo(14500, 2);
    // prev = 8000, cur = 14500 → +81.25 % → up
    expect(s.hero.deltaPct).not.toBeNull();
    expect(s.hero.deltaPct ?? 0).toBeGreaterThan(80);
    expect(s.hero.deltaSign).toBe('up');
    expect(s.breakdown).toHaveLength(2);
    expect(s.breakdown[0]?.label).toBe('Acme');
    expect(s.breakdown[0]?.value).toBeCloseTo(10000, 2);
  });

  it('zero prior period yields deltaPct=null and deltaSign=flat', async () => {
    (fetchSalesByCustomerRows as unknown as ReturnType<typeof vi.fn>)
      .mockResolvedValueOnce({
        headers: [],
        rows: [['Acme', '100.00', '60.00', '40.00', '40.00', 1]],
        filenameSuffix: 'x',
      })
      .mockResolvedValueOnce({ headers: [], rows: [], filenameSuffix: 'y' });

    const s = await computeSummary('sales-by-customer', 'this-month', tenantCtx);
    expect(s.hero.deltaPct).toBeNull();
    expect(s.hero.deltaSign).toBe('flat');
  });

  it('breakdown capped at 10', async () => {
    const many = Array.from({ length: 25 }, (_, i) => [
      `C${i}`,
      `${(25 - i) * 1000}.00`,
      '0.00',
      '0.00',
      '0.00',
      1,
    ]);
    (fetchSalesByCustomerRows as unknown as ReturnType<typeof vi.fn>)
      .mockResolvedValueOnce({ headers: [], rows: many, filenameSuffix: 'x' })
      .mockResolvedValueOnce({ headers: [], rows: [], filenameSuffix: 'y' });

    const s = await computeSummary('sales-by-customer', 'this-month', tenantCtx);
    expect(s.breakdown).toHaveLength(10);
    expect(s.breakdown[0]?.label).toBe('C0');
  });
});

describe('computeSummary — sales-by-product', () => {
  it('uses the product fetcher and the same shape', async () => {
    (fetchSalesByProductRows as unknown as ReturnType<typeof vi.fn>)
      .mockResolvedValueOnce({
        headers: [],
        rows: [['Widget A', '5000.00', '2000.00', '3000.00', '60.00', 50]],
        filenameSuffix: 'x',
      })
      .mockResolvedValueOnce({ headers: [], rows: [], filenameSuffix: 'y' });

    const s = await computeSummary('sales-by-product', 'this-month', tenantCtx);
    expect(s.type).toBe('sales-by-product');
    expect(s.hero.value).toBeCloseTo(5000, 2);
    expect(s.breakdown[0]?.label).toBe('Widget A');
  });
});

describe('computeSummary — gross-profit', () => {
  it('hero=sum of margin; breakdown top-10 by margin; delta vs prior period', async () => {
    const cur = [
      // [name, revenue, cost, margin, marginPct, quantity]
      ['Acme', '10000.00', '6000.00', '4000.00', '40.00', 12],
      ['BetaCo', '4500.00', '3000.00', '1500.00', '33.33', 9],
      ['Gamma', '20000.00', '17000.00', '3000.00', '15.00', 50],
    ];
    const prev = [['Acme', '8000.00', '5000.00', '3000.00', '37.50', 10]];
    (fetchSalesByCustomerRows as unknown as ReturnType<typeof vi.fn>)
      .mockResolvedValueOnce({ headers: [], rows: cur, filenameSuffix: 'x' })
      .mockResolvedValueOnce({ headers: [], rows: prev, filenameSuffix: 'y' });

    const s = await computeSummary('gross-profit', 'this-month', tenantCtx);
    expect(s.type).toBe('gross-profit');
    expect(s.hero.value).toBeCloseTo(4000 + 1500 + 3000, 2);
    // prev=3000, cur=8500 → +183 % → up
    expect(s.hero.deltaSign).toBe('up');
    expect(s.breakdown).toHaveLength(3);
    // sorted by margin desc → Acme(4000), Gamma(3000), Beta(1500)
    expect(s.breakdown[0]?.label).toBe('Acme');
    expect(s.breakdown[1]?.label).toBe('Gamma');
    expect(s.breakdown[2]?.label).toBe('BetaCo');
  });

  it('zero prior margin → deltaPct=null/flat', async () => {
    (fetchSalesByCustomerRows as unknown as ReturnType<typeof vi.fn>)
      .mockResolvedValueOnce({
        headers: [],
        rows: [['Acme', '100.00', '60.00', '40.00', '40.00', 1]],
        filenameSuffix: 'x',
      })
      .mockResolvedValueOnce({ headers: [], rows: [], filenameSuffix: 'y' });

    const s = await computeSummary('gross-profit', 'this-month', tenantCtx);
    expect(s.hero.deltaPct).toBeNull();
    expect(s.hero.deltaSign).toBe('flat');
  });
});
