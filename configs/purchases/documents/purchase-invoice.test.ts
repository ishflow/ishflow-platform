import { beforeEach, describe, expect, it } from 'vitest';
import './purchase-invoice';
import { getRegistry } from '@/platform/metadata';

describe('purchase-invoice posting → inventory.stock_balance', () => {
  beforeEach(() => {
    // noop — registry is module-singleton; test reads same config.
  });

  it('emits income movements with quantity + totalCost', async () => {
    const cfg = getRegistry().document['purchases.invoice'];
    expect(cfg).toBeDefined();

    const fakeCtx = {
      register: () => ({
        balance: async () => ({ quantity: 0 }),
        balanceAll: async () => ({}),
      }),
    };

    const doc = {
      date: new Date('2026-04-18'),
      supplier: 'sup-1',
      warehouse: 'wh-1',
      lines: {
        items: [
          { product: 'prod-kola', quantity: 1000, price: 100 },
          { product: 'prod-pepsi', quantity: 500, price: 90 },
        ],
      },
    };

    const mapper = cfg?.posting['inventory.stock_balance'];
    expect(mapper).toBeDefined();
    const rows = (await mapper?.(doc as never, fakeCtx as never)) as Array<Record<string, unknown>>;

    expect(rows).toHaveLength(2);
    expect(rows[0]).toMatchObject({
      kind: 'income',
      warehouse: 'wh-1',
      product: 'prod-kola',
      quantity: 1000,
      totalCost: 1000 * 100, // 100 000
    });
    expect(rows[1]).toMatchObject({
      quantity: 500,
      totalCost: 500 * 90, // 45 000
    });
  });
});
