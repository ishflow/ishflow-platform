import { describe, expect, it } from 'vitest';
import './retail-sale';
import { getRegistry } from '@/platform/metadata';

describe('sales.retail_sale document config', () => {
  it('is registered in the metadata registry', () => {
    expect(getRegistry().document['sales.retail_sale']).toBeDefined();
  });

  it('requires warehouse + date; cashRegister optional; NO customer ref', () => {
    const cfg = getRegistry().document['sales.retail_sale'];
    expect(cfg?.header?.warehouse?.required).toBe(true);
    expect(cfg?.header?.date?.required).toBe(true);
    expect(cfg?.header?.cashRegister?.required).toBeFalsy();
    expect(cfg?.header?.customer).toBeUndefined();
  });

  it('items section: product+quantity+price required', () => {
    const items = getRegistry().document['sales.retail_sale']?.lines?.items;
    expect(items?.minRows).toBe(1);
    expect(items?.fields?.product?.required).toBe(true);
    expect(items?.fields?.quantity?.required).toBe(true);
    expect(items?.fields?.price?.required).toBe(true);
  });

  it('posts to finance.vat + inventory.stock_balance + sales.sale + treasury.cash_funds', () => {
    const cfg = getRegistry().document['sales.retail_sale'];
    expect(Object.keys(cfg?.posting ?? {}).sort()).toEqual([
      'finance.vat',
      'inventory.stock_balance',
      'sales.sale',
      'treasury.cash_funds',
    ]);
  });

  const taxOffCtx = { tx: { tenantSettings: { findFirst: async () => null } } } as never;
  const taxOnCtx = {
    tx: {
      tenantSettings: {
        findFirst: async () => ({ payload: { taxEnabled: true, defaultTaxRatePct: 20 } }),
      },
    },
  } as never;
  const date = new Date('2026-05-22T00:00:00.000Z');
  const sale = {
    date,
    warehouse: 'w-1',
    cashRegister: 'cash-1',
    lines: {
      items: [
        { product: 'p-a', quantity: 2, price: 10 },
        { product: 'p-b', quantity: 1, price: 5 },
      ],
    },
  };

  it('treasury.cash_funds posting returns [] when cashRegister is unset', async () => {
    const fn = getRegistry().document['sales.retail_sale']?.posting['treasury.cash_funds'];
    if (!fn) throw new Error('expected posting fn');
    const out = (await fn(
      {
        date: new Date(),
        warehouse: 'w-1',
        lines: { items: [{ product: 'p-1', quantity: 1, price: 10 }] },
      } as never,
      taxOffCtx,
    )) as Array<unknown>;
    expect(out).toEqual([]);
  });

  it('treasury.cash_funds collects the net cash when tax is off', async () => {
    const fn = getRegistry().document['sales.retail_sale']?.posting['treasury.cash_funds'];
    if (!fn) throw new Error('expected posting fn');
    const out = (await fn(sale as never, taxOffCtx)) as Array<Record<string, unknown>>;
    expect(out).toHaveLength(1);
    expect(out[0]).toMatchObject({ kind: 'income', cashRegister: 'cash-1', amount: 25 });
  });

  it('collects GROSS cash + records output VAT (counterparty "retail") when tax is on', async () => {
    const cashFn = getRegistry().document['sales.retail_sale']?.posting['treasury.cash_funds'];
    const vatFn = getRegistry().document['sales.retail_sale']?.posting['finance.vat'];
    if (!cashFn || !vatFn) throw new Error('expected posting fns');
    const cash = (await cashFn(sale as never, taxOnCtx)) as Array<Record<string, unknown>>;
    expect(cash[0]).toMatchObject({ amount: 30 }); // 25 + 20% VAT (5)
    const vat = (await vatFn(sale as never, taxOnCtx)) as Array<Record<string, unknown>>;
    expect(vat[0]).toMatchObject({ kind: 'income', counterparty: 'retail', amount: 5 });
  });
});
