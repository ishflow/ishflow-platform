import { describe, expect, it } from 'vitest';
import './bank-withdrawal';
import { getRegistry } from '@/platform/metadata';

describe('treasury.bank_withdrawal document config', () => {
  it('is registered in the metadata registry', () => {
    expect(getRegistry().document['treasury.bank_withdrawal']).toBeDefined();
  });

  it('has required bankAccount + cashRegister + amount with no lines', () => {
    const cfg = getRegistry().document['treasury.bank_withdrawal'];
    expect(cfg?.header?.bankAccount?.required).toBe(true);
    expect(cfg?.header?.cashRegister?.required).toBe(true);
    expect(cfg?.header?.amount?.required).toBe(true);
    expect(cfg?.lines ?? {}).toEqual({});
  });

  it('posts ONLY to treasury.cash_funds', () => {
    const cfg = getRegistry().document['treasury.bank_withdrawal'];
    expect(Object.keys(cfg?.posting ?? {})).toEqual(['treasury.cash_funds']);
  });

  it('emits a single income movement on the destination cashRegister', async () => {
    const cfg = getRegistry().document['treasury.bank_withdrawal'];
    const fn = cfg?.posting['treasury.cash_funds'];
    if (!fn) throw new Error('expected posting fn');
    const date = new Date('2026-05-22T00:00:00.000Z');
    const out = (await fn(
      {
        date,
        bankAccount: 'bank-1',
        cashRegister: 'cash-1',
        amount: 50,
      } as never,
      {} as never,
    )) as Array<Record<string, unknown>>;
    expect(out).toHaveLength(1);
    expect(out[0]).toMatchObject({
      kind: 'income',
      cashRegister: 'cash-1',
      amount: 50,
    });
  });

  it('posting returns [] when amount is 0', async () => {
    const cfg = getRegistry().document['treasury.bank_withdrawal'];
    const fn = cfg?.posting['treasury.cash_funds'];
    if (!fn) throw new Error('expected posting fn');
    const out = (await fn(
      {
        date: new Date(),
        bankAccount: 'bank-1',
        cashRegister: 'cash-1',
        amount: 0,
      } as never,
      {} as never,
    )) as Array<unknown>;
    expect(out).toEqual([]);
  });
});
