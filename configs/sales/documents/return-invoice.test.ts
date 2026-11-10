import '@/configs';
import { getRegistry } from '@/platform/metadata';
import { describe, expect, it } from 'vitest';

describe('sales.return_invoice', () => {
  it('is registered in the metadata registry', () => {
    expect(getRegistry().document['sales.return_invoice']).toBeDefined();
  });

  it('posts to inventory.stock_balance + sales.accounts_receivable + sales.sale', () => {
    const config = getRegistry().document['sales.return_invoice'];
    const targets = Object.keys(config?.posting ?? {});
    expect(targets).toEqual(
      expect.arrayContaining([
        'inventory.stock_balance',
        'sales.accounts_receivable',
        'sales.sale',
      ]),
    );
  });

  // Regression guard for QA #57: a return must post a single AR *expense*
  // movement so the customer's open balance drops by the returned total. Both
  // readers (AR register + counterparty card) compute balance as income −
  // expense, so this keeps the two surfaces consistent (no ₺120 divergence).
  it('posts one AR expense movement equal to the returned total (reduces balance)', async () => {
    const mapper = getRegistry().document['sales.return_invoice']?.posting?.[
      'sales.accounts_receivable'
    ] as unknown as (
      doc: unknown,
    ) => Promise<Array<{ kind: string; amount: number; customer: string }>>;
    expect(mapper).toBeDefined();
    const rows = await mapper({
      date: new Date('2026-06-03'),
      customer: 'cust-1',
      lines: { items: [{ quantity: 2, price: 60 }] }, // ₺120 returned
    });
    expect(rows).toHaveLength(1);
    expect(rows[0]?.kind).toBe('expense');
    expect(rows[0]?.amount).toBe(120);
  });

  it('has originalInvoice as an optional reference to sales.invoice', () => {
    const oi = getRegistry().document['sales.return_invoice']?.header?.originalInvoice;
    expect(oi?.type).toBe('reference');
    expect(oi?.required).toBeFalsy();
    if (oi?.type === 'reference') {
      expect(oi.to).toEqual({ kind: 'ref', module: 'sales', name: 'invoice' });
      // #75 pattern — the original-invoice picker is scoped to the selected customer.
      expect(oi.filterByHeaderField).toBe('customer');
    }
  });

  it('has required header refs: customer + warehouse', () => {
    const config = getRegistry().document['sales.return_invoice'];
    expect(config?.header?.customer?.required).toBe(true);
    expect(config?.header?.warehouse?.required).toBe(true);
  });

  it('declares reason as a string enum with 4 expected values', () => {
    const reason = getRegistry().document['sales.return_invoice']?.header?.reason;
    expect(reason?.type).toBe('string');
    if (reason?.type === 'string') {
      expect(reason.enumValues).toEqual(
        expect.arrayContaining(['defective', 'customerCancel', 'damaged', 'warranty']),
      );
    }
  });

  it('declares notes as a text field', () => {
    const notes = getRegistry().document['sales.return_invoice']?.header?.notes;
    expect(notes?.type).toBe('text');
  });

  it('marks items section with lineBehavior returnFromInvoice', () => {
    const items = getRegistry().document['sales.return_invoice']?.lines?.items;
    expect(items?.lineBehavior).toBe('returnFromInvoice');
  });
});
