import { describe, expect, it } from 'vitest';
import './service-sale';
import { getRegistry } from '@/platform/metadata';

describe('sales.service_sale document config', () => {
  it('is registered in the metadata registry', () => {
    expect(getRegistry().document['sales.service_sale']).toBeDefined();
  });

  it('requires customer + date in the header', () => {
    const cfg = getRegistry().document['sales.service_sale'];
    expect(cfg?.header?.customer?.required).toBe(true);
    expect(cfg?.header?.date?.required).toBe(true);
  });

  it('items section: description/quantity/price all required, NO product ref', () => {
    const items = getRegistry().document['sales.service_sale']?.lines?.items;
    expect(items?.minRows).toBe(1);
    expect(items?.fields?.description?.required).toBe(true);
    expect(items?.fields?.quantity?.required).toBe(true);
    expect(items?.fields?.price?.required).toBe(true);
    expect(items?.fields?.product).toBeUndefined();
  });

  it('posts to sales.accounts_receivable + finance.vat (no stock movements)', () => {
    const cfg = getRegistry().document['sales.service_sale'];
    expect(Object.keys(cfg?.posting ?? {})).toEqual(['sales.accounts_receivable', 'finance.vat']);
  });

  // Mock posting ctx with the tenant tax setting off / on (the AR + finance.vat
  // mappers call resolveTaxSettings(ctx.tx)).
  const taxOffCtx = { tx: { tenantSettings: { findFirst: async () => null } } } as never;
  const taxOnCtx = {
    tx: {
      tenantSettings: {
        findFirst: async () => ({ payload: { taxEnabled: true, defaultTaxRatePct: 20 } }),
      },
    },
  } as never;
  const date = new Date('2026-05-22T00:00:00.000Z');
  const twoLines = {
    date,
    customer: 'cust-1',
    lines: {
      items: [
        { description: 'Consulting', quantity: 2, price: 50 },
        { description: 'Hosting', quantity: 1, price: 25 },
      ],
    },
  };

  it('AR posting writes the net total when tax is off', async () => {
    const fn = getRegistry().document['sales.service_sale']?.posting['sales.accounts_receivable'];
    if (!fn) throw new Error('expected posting fn');
    const out = (await fn(twoLines as never, taxOffCtx)) as Array<Record<string, unknown>>;
    expect(out).toHaveLength(1);
    expect(out[0]).toMatchObject({ kind: 'income', customer: 'cust-1', amount: 125 });
  });

  it('AR posting writes the GROSS (subtotal + VAT) when tax is enabled', async () => {
    const fn = getRegistry().document['sales.service_sale']?.posting['sales.accounts_receivable'];
    if (!fn) throw new Error('expected posting fn');
    const out = (await fn(twoLines as never, taxOnCtx)) as Array<Record<string, unknown>>;
    expect(out[0]).toMatchObject({ amount: 150 }); // 125 + 20% VAT (25)
  });

  it('finance.vat posts OUTPUT VAT when tax is enabled, nothing when off', async () => {
    const fn = getRegistry().document['sales.service_sale']?.posting['finance.vat'];
    if (!fn) throw new Error('expected posting fn');
    const on = (await fn(twoLines as never, taxOnCtx)) as Array<Record<string, unknown>>;
    expect(on).toHaveLength(1);
    expect(on[0]).toMatchObject({ kind: 'income', counterparty: 'cust-1', amount: 25 });
    const off = (await fn(twoLines as never, taxOffCtx)) as Array<unknown>;
    expect(off).toEqual([]);
  });

  it('AR posting returns [] when total is zero', async () => {
    const fn = getRegistry().document['sales.service_sale']?.posting['sales.accounts_receivable'];
    if (!fn) throw new Error('expected posting fn');
    const out = (await fn(
      { date: new Date(), customer: 'c', lines: { items: [{ quantity: 0, price: 0 }] } } as never,
      taxOffCtx,
    )) as Array<unknown>;
    expect(out).toEqual([]);
  });
});
