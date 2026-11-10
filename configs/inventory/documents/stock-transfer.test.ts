import '@/configs';
import { getRegistry } from '@/platform/metadata';
import { describe, expect, it } from 'vitest';

describe('inventory.stock_transfer', () => {
  it('is registered in the metadata registry', () => {
    const reg = getRegistry();
    expect(reg.document['inventory.stock_transfer']).toBeDefined();
  });

  it('writes paired entries to inventory.stock_balance', () => {
    const config = getRegistry().document['inventory.stock_transfer'];
    expect(Object.keys(config?.posting ?? {})).toEqual(['inventory.stock_balance']);
  });

  it('declares a prePost validator array', () => {
    const config = getRegistry().document['inventory.stock_transfer'];
    expect(Array.isArray(config?.validators?.prePost)).toBe(true);
    expect(config?.validators?.prePost?.length ?? 0).toBeGreaterThan(0);
  });

  it('has two warehouse references on the header', () => {
    const config = getRegistry().document['inventory.stock_transfer'];
    expect(config?.header?.sourceWarehouse?.type).toBe('reference');
    expect(config?.header?.destinationWarehouse?.type).toBe('reference');
  });

  it('rejects same-source-and-destination via prePost', async () => {
    const config = getRegistry().document['inventory.stock_transfer'];
    const sameWh = '11111111-1111-1111-1111-111111111111';
    const validator = config?.validators?.prePost?.[0];
    expect(validator).toBeDefined();
    const result = await validator?.(
      { sourceWarehouse: sameWh, destinationWarehouse: sameWh } as never,
      {} as never,
    );
    expect(result).toEqual({ ok: false, message: 'WAREHOUSE_SAME' });
  });

  it('accepts different warehouses', async () => {
    const config = getRegistry().document['inventory.stock_transfer'];
    const validator = config?.validators?.prePost?.[0];
    const result = await validator?.(
      {
        sourceWarehouse: '11111111-1111-1111-1111-111111111111',
        destinationWarehouse: '22222222-2222-2222-2222-222222222222',
      } as never,
      {} as never,
    );
    expect(result).toEqual({ ok: true });
  });

  it('declares 2 prePost validators (WAREHOUSE_SAME + INSUFFICIENT_STOCK)', () => {
    const validators =
      getRegistry().document['inventory.stock_transfer']?.validators?.prePost ?? [];
    expect(validators.length).toBeGreaterThanOrEqual(2);
  });

  it('rejects when source warehouse balance is below demand', async () => {
    const config = getRegistry().document['inventory.stock_transfer'];
    const validators = config?.validators?.prePost ?? [];
    // INSUFFICIENT_STOCK is the second validator (WAREHOUSE_SAME is first).
    const stockValidator = validators[1];
    const stubCtx = {
      register: () => ({
        balance: async () => ({ quantity: 0, totalCost: 0 }),
      }),
    } as unknown as Parameters<NonNullable<typeof stockValidator>>[1];
    const result = await stockValidator?.(
      {
        sourceWarehouse: '11111111-1111-1111-1111-111111111111',
        destinationWarehouse: '22222222-2222-2222-2222-222222222222',
        lines: {
          items: [{ product: '33333333-3333-3333-3333-333333333333', quantity: 5 }],
        },
      } as never,
      stubCtx,
    );
    expect(result).toEqual({ ok: false, message: 'INSUFFICIENT_STOCK' });
  });
});
