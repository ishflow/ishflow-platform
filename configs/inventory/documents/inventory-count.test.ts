import '@/configs';
import { getRegistry } from '@/platform/metadata';
import { describe, expect, it } from 'vitest';

describe('inventory.inventory_count', () => {
  it('is registered in the metadata registry', () => {
    const reg = getRegistry();
    expect(reg.document['inventory.inventory_count']).toBeDefined();
  });

  it('writes adjustments to inventory.stock_balance only', () => {
    const config = getRegistry().document['inventory.inventory_count'];
    expect(Object.keys(config?.posting ?? {})).toEqual(['inventory.stock_balance']);
  });

  it('has countStatus as a closed-enum string', () => {
    const config = getRegistry().document['inventory.inventory_count'];
    const status = config?.header?.countStatus;
    expect(status?.type).toBe('string');
    if (status?.type === 'string') {
      expect(status.enumValues).toEqual(['counting', 'counted']);
    }
  });

  it('exposes expected + counted line fields', () => {
    const config = getRegistry().document['inventory.inventory_count'];
    const fields = config?.lines?.items?.fields ?? {};
    expect(fields.expectedQuantity?.type).toBe('number');
    expect(fields.countedQuantity?.type).toBe('number');
    expect(fields.countedQuantity?.required).toBe(true);
  });
});

type StockMovement = { kind: string; quantity: number; totalCost: number };

function stockMapper() {
  const cfg = getRegistry().document['inventory.inventory_count'];
  const mapper = cfg?.posting?.['inventory.stock_balance'];
  if (!mapper) throw new Error('stock_balance posting mapper not registered');
  return mapper as unknown as (doc: unknown, ctx: unknown) => Promise<StockMovement[]>;
}

function mockCtx(quantity: number, totalCost: number) {
  return {
    register: () => ({
      balance: async () => ({ quantity: 0 }),
      balanceAll: async () => ({ quantity, totalCost }),
    }),
  };
}

describe('inventory_count shrinkage write-off (#74)', () => {
  it('writes off the shortfall at current average unit cost', async () => {
    // 55 on hand worth ₺2750 → avg ₺50/unit. Counted 53 → 2 units short.
    const rows = await stockMapper()(
      {
        date: new Date('2026-06-03'),
        warehouse: 'wh-1',
        lines: { items: [{ product: 'p-1', expectedQuantity: 55, countedQuantity: 53 }] },
      },
      mockCtx(55, 2750),
    );
    expect(rows).toHaveLength(1);
    expect(rows[0]?.kind).toBe('expense');
    expect(rows[0]?.quantity).toBe(2);
    // Was 0 (value stayed at ₺2750, unit cost inflated to ₺51.89). Now 2 × ₺50.
    expect(rows[0]?.totalCost).toBeCloseTo(100, 2);
  });

  it('resolves expected from balance when the line omits it', async () => {
    const rows = await stockMapper()(
      {
        date: new Date('2026-06-03'),
        warehouse: 'wh-1',
        lines: { items: [{ product: 'p-1', countedQuantity: 8 }] },
      },
      mockCtx(10, 500), // avg ₺50, expected resolves to 10 → 2 short
    );
    expect(rows[0]?.kind).toBe('expense');
    expect(rows[0]?.totalCost).toBeCloseTo(100, 2);
  });

  it('leaves excess (income) at zero cost — a paired adjustment carries it', async () => {
    const rows = await stockMapper()(
      {
        date: new Date('2026-06-03'),
        warehouse: 'wh-1',
        lines: { items: [{ product: 'p-1', expectedQuantity: 10, countedQuantity: 12 }] },
      },
      mockCtx(10, 500),
    );
    expect(rows[0]?.kind).toBe('income');
    expect(rows[0]?.totalCost).toBe(0);
  });
});
