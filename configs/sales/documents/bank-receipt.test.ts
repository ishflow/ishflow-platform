import { describe, expect, it } from 'vitest';
import './bank-receipt';
import { getRegistry } from '@/platform/metadata';

describe('sales.bank_receipt document config', () => {
  it('is registered in the metadata registry', () => {
    expect(getRegistry().document['sales.bank_receipt']).toBeDefined();
  });

  it('has required customer + bankAccount + amount with no lines', () => {
    const cfg = getRegistry().document['sales.bank_receipt'];
    expect(cfg?.header?.customer?.required).toBe(true);
    expect(cfg?.header?.bankAccount?.required).toBe(true);
    expect(cfg?.header?.amount?.required).toBe(true);
    expect(cfg?.lines ?? {}).toEqual({});
  });

  it('posts to BOTH sales.accounts_receivable AND treasury.bank_funds', () => {
    const cfg = getRegistry().document['sales.bank_receipt'];
    expect(Object.keys(cfg?.posting ?? {}).sort()).toEqual(
      ['sales.accounts_receivable', 'treasury.bank_funds'].sort(),
    );
  });

  it('emits AR expense + bank_funds income with the entered amount', async () => {
    const cfg = getRegistry().document['sales.bank_receipt'];
    const arFn = cfg?.posting['sales.accounts_receivable'];
    const bankFn = cfg?.posting['treasury.bank_funds'];
    if (!arFn || !bankFn) throw new Error('expected both posting fns');
    const date = new Date('2026-05-22T00:00:00.000Z');
    const doc = {
      date,
      customer: 'cust-1',
      bankAccount: 'bank-1',
      amount: 50,
    } as never;
    const ctx = {} as never;
    const ar = (await arFn(doc, ctx)) as Array<Record<string, unknown>>;
    expect(ar).toHaveLength(1);
    expect(ar[0]).toMatchObject({
      kind: 'expense',
      customer: 'cust-1',
      amount: 50,
    });
    const bank = (await bankFn(doc, ctx)) as Array<Record<string, unknown>>;
    expect(bank).toHaveLength(1);
    expect(bank[0]).toMatchObject({
      kind: 'income',
      bankAccount: 'bank-1',
      amount: 50,
    });
  });

  it('posting returns [] when amount is 0', async () => {
    const cfg = getRegistry().document['sales.bank_receipt'];
    const arFn = cfg?.posting['sales.accounts_receivable'];
    const bankFn = cfg?.posting['treasury.bank_funds'];
    if (!arFn || !bankFn) throw new Error('expected both posting fns');
    const ctx = {} as never;
    const doc = {
      date: new Date(),
      customer: 'cust-1',
      bankAccount: 'bank-1',
      amount: 0,
    } as never;
    expect(await arFn(doc, ctx)).toEqual([]);
    expect(await bankFn(doc, ctx)).toEqual([]);
  });
});
