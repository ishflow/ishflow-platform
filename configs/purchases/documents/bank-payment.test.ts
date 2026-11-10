import { describe, expect, it } from 'vitest';
import './bank-payment';
import { getRegistry } from '@/platform/metadata';

describe('purchases.bank_payment document config', () => {
  it('is registered in the metadata registry', () => {
    expect(getRegistry().document['purchases.bank_payment']).toBeDefined();
  });

  it('has required supplier + bankAccount + amount with no lines', () => {
    const cfg = getRegistry().document['purchases.bank_payment'];
    expect(cfg?.header?.supplier?.required).toBe(true);
    expect(cfg?.header?.bankAccount?.required).toBe(true);
    expect(cfg?.header?.amount?.required).toBe(true);
    expect(cfg?.lines ?? {}).toEqual({});
  });

  it('posts to BOTH purchases.accounts_payable AND treasury.bank_funds', () => {
    const cfg = getRegistry().document['purchases.bank_payment'];
    expect(Object.keys(cfg?.posting ?? {}).sort()).toEqual(
      ['purchases.accounts_payable', 'treasury.bank_funds'].sort(),
    );
  });

  it('emits AP expense + bank_funds expense with document amounts', async () => {
    const cfg = getRegistry().document['purchases.bank_payment'];
    const apFn = cfg?.posting['purchases.accounts_payable'];
    const bankFn = cfg?.posting['treasury.bank_funds'];
    if (!apFn || !bankFn) throw new Error('expected both posting fns');
    const date = new Date('2026-05-22T00:00:00.000Z');
    const doc = {
      date,
      supplier: 'sup-1',
      bankAccount: 'bank-1',
      amount: 50,
    } as never;
    const ctx = {} as never;
    const ap = (await apFn(doc, ctx)) as Array<Record<string, unknown>>;
    expect(ap).toHaveLength(1);
    expect(ap[0]).toMatchObject({
      kind: 'expense',
      supplier: 'sup-1',
      amount: 50,
    });
    const bank = (await bankFn(doc, ctx)) as Array<Record<string, unknown>>;
    expect(bank).toHaveLength(1);
    expect(bank[0]).toMatchObject({
      kind: 'expense',
      bankAccount: 'bank-1',
      amount: 50,
    });
  });

  it('posting returns [] when amount is 0', async () => {
    const cfg = getRegistry().document['purchases.bank_payment'];
    const apFn = cfg?.posting['purchases.accounts_payable'];
    const bankFn = cfg?.posting['treasury.bank_funds'];
    if (!apFn || !bankFn) throw new Error('expected both posting fns');
    const ctx = {} as never;
    const doc = {
      date: new Date(),
      supplier: 'sup-1',
      bankAccount: 'bank-1',
      amount: 0,
    } as never;
    expect(await apFn(doc, ctx)).toEqual([]);
    expect(await bankFn(doc, ctx)).toEqual([]);
  });
});
