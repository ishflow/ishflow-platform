import { describe, expect, it } from 'vitest';
import './service-receipt';
import { getRegistry } from '@/platform/metadata';

describe('purchases.service_receipt document config', () => {
  it('is registered in the metadata registry', () => {
    expect(getRegistry().document['purchases.service_receipt']).toBeDefined();
  });

  it('requires supplier + date in the header', () => {
    const cfg = getRegistry().document['purchases.service_receipt'];
    expect(cfg?.header?.supplier?.required).toBe(true);
    expect(cfg?.header?.date?.required).toBe(true);
  });

  it('items section: description/quantity/price all required, NO product ref', () => {
    const items = getRegistry().document['purchases.service_receipt']?.lines?.items;
    expect(items?.minRows).toBe(1);
    expect(items?.fields?.description?.required).toBe(true);
    expect(items?.fields?.quantity?.required).toBe(true);
    expect(items?.fields?.price?.required).toBe(true);
    expect(items?.fields?.product).toBeUndefined();
  });

  it('posts to purchases.accounts_payable + finance.vat (no stock movements)', () => {
    const cfg = getRegistry().document['purchases.service_receipt'];
    expect(Object.keys(cfg?.posting ?? {})).toEqual(['purchases.accounts_payable', 'finance.vat']);
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
  const twoLines = {
    date,
    supplier: 'sup-1',
    lines: {
      items: [
        { description: 'Hosting', quantity: 2, price: 50 },
        { description: 'Support', quantity: 1, price: 25 },
      ],
    },
  };

  it('AP posting writes the net total when tax is off', async () => {
    const fn =
      getRegistry().document['purchases.service_receipt']?.posting['purchases.accounts_payable'];
    if (!fn) throw new Error('expected posting fn');
    const out = (await fn(twoLines as never, taxOffCtx)) as Array<Record<string, unknown>>;
    expect(out).toHaveLength(1);
    expect(out[0]).toMatchObject({ kind: 'income', supplier: 'sup-1', amount: 125 });
  });

  it('AP posting writes the GROSS (subtotal + VAT) when tax is enabled', async () => {
    const fn =
      getRegistry().document['purchases.service_receipt']?.posting['purchases.accounts_payable'];
    if (!fn) throw new Error('expected posting fn');
    const out = (await fn(twoLines as never, taxOnCtx)) as Array<Record<string, unknown>>;
    expect(out[0]).toMatchObject({ amount: 150 }); // 125 + 20% VAT (25)
  });

  it('finance.vat posts INPUT VAT (expense) when tax is enabled, nothing when off', async () => {
    const fn = getRegistry().document['purchases.service_receipt']?.posting['finance.vat'];
    if (!fn) throw new Error('expected posting fn');
    const on = (await fn(twoLines as never, taxOnCtx)) as Array<Record<string, unknown>>;
    expect(on).toHaveLength(1);
    expect(on[0]).toMatchObject({ kind: 'expense', counterparty: 'sup-1', amount: 25 });
    const off = (await fn(twoLines as never, taxOffCtx)) as Array<unknown>;
    expect(off).toEqual([]);
  });
});
