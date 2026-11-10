import '@/configs';
import { getRegistry } from '@/platform/metadata';
import { describe, expect, it } from 'vitest';

describe('purchases.return_purchase', () => {
  it('is registered in the metadata registry', () => {
    expect(getRegistry().document['purchases.return_purchase']).toBeDefined();
  });

  it('posts to inventory.stock_balance + purchases.accounts_payable', () => {
    const config = getRegistry().document['purchases.return_purchase'];
    const targets = Object.keys(config?.posting ?? {});
    expect(targets).toEqual(
      expect.arrayContaining(['inventory.stock_balance', 'purchases.accounts_payable']),
    );
  });

  it('has required header refs: supplier + warehouse', () => {
    const config = getRegistry().document['purchases.return_purchase'];
    expect(config?.header?.supplier?.required).toBe(true);
    expect(config?.header?.warehouse?.required).toBe(true);
  });

  it('has originalInvoice as an optional reference to purchases.invoice', () => {
    const oi = getRegistry().document['purchases.return_purchase']?.header?.originalInvoice;
    expect(oi?.type).toBe('reference');
    expect(oi?.required).toBeFalsy();
    if (oi?.type === 'reference') {
      expect(oi.to).toEqual({ kind: 'ref', module: 'purchases', name: 'invoice' });
      // #75 — the original-invoice picker is scoped to the selected supplier.
      expect(oi.filterByHeaderField).toBe('supplier');
    }
  });

  it('declares reason as a string enum with 5 expected values', () => {
    const reason = getRegistry().document['purchases.return_purchase']?.header?.reason;
    expect(reason?.type).toBe('string');
    if (reason?.type === 'string') {
      expect(reason.enumValues).toEqual(
        expect.arrayContaining([
          'defective',
          'wrongItem',
          'damagedInTransit',
          'excessDelivery',
          'other',
        ]),
      );
    }
  });

  it('declares an INSUFFICIENT_STOCK prePost validator', async () => {
    const config = getRegistry().document['purchases.return_purchase'];
    const validators = config?.validators?.prePost ?? [];
    expect(validators.length).toBeGreaterThan(0);
    const stubCtx = {
      register: () => ({
        balance: async () => ({ quantity: 0, totalCost: 0 }),
      }),
    } as unknown as Parameters<NonNullable<(typeof validators)[0]>>[1];
    const result = await validators[0]?.(
      {
        warehouse: '11111111-1111-1111-1111-111111111111',
        lines: {
          items: [{ product: '22222222-2222-2222-2222-222222222222', quantity: 1, price: 1 }],
        },
      } as never,
      stubCtx,
    );
    expect(result).toEqual({ ok: false, message: 'INSUFFICIENT_STOCK' });
  });

  it('marks items section with lineBehavior returnFromInvoice', () => {
    const items = getRegistry().document['purchases.return_purchase']?.lines?.items;
    expect(items?.lineBehavior).toBe('returnFromInvoice');
  });
});
