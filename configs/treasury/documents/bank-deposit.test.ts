import { describe, expect, it } from 'vitest';
import './bank-deposit';
import { getRegistry } from '@/platform/metadata';

describe('treasury.bank_deposit document config', () => {
  it('is registered in the metadata registry', () => {
    expect(getRegistry().document['treasury.bank_deposit']).toBeDefined();
  });

  it('has required cashRegister + bankAccount + amount with no lines', () => {
    const cfg = getRegistry().document['treasury.bank_deposit'];
    expect(cfg?.header?.cashRegister?.required).toBe(true);
    expect(cfg?.header?.bankAccount?.required).toBe(true);
    expect(cfg?.header?.amount?.required).toBe(true);
    expect(cfg?.lines ?? {}).toEqual({});
  });

  it('posts ONLY to treasury.cash_funds', () => {
    const cfg = getRegistry().document['treasury.bank_deposit'];
    expect(Object.keys(cfg?.posting ?? {})).toEqual(['treasury.cash_funds']);
  });

  it('emits a single expense movement on the source cashRegister', async () => {
    const cfg = getRegistry().document['treasury.bank_deposit'];
    const fn = cfg?.posting['treasury.cash_funds'];
    if (!fn) throw new Error('expected posting fn');
    const date = new Date('2026-05-22T00:00:00.000Z');
    const out = (await fn(
      {
        date,
        cashRegister: 'cash-1',
        bankAccount: 'bank-1',
        amount: 50,
      } as never,
      {} as never,
    )) as Array<Record<string, unknown>>;
    expect(out).toHaveLength(1);
    expect(out[0]).toMatchObject({
      kind: 'expense',
      cashRegister: 'cash-1',
      amount: 50,
    });
  });

  it('posting returns [] when amount is 0', async () => {
    const cfg = getRegistry().document['treasury.bank_deposit'];
    const fn = cfg?.posting['treasury.cash_funds'];
    if (!fn) throw new Error('expected posting fn');
    const out = (await fn(
      {
        date: new Date(),
        cashRegister: 'cash-1',
        bankAccount: 'bank-1',
        amount: 0,
      } as never,
      {} as never,
    )) as Array<unknown>;
    expect(out).toEqual([]);
  });
});
