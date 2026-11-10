import { describe, expect, it } from 'vitest';
import './refund-received';
import { getRegistry } from '@/platform/metadata';

describe('purchases.refund_received document config', () => {
  it('is registered in the metadata registry', () => {
    expect(getRegistry().document['purchases.refund_received']).toBeDefined();
  });

  it('has required supplier + optional cashRegister; no lines', () => {
    const cfg = getRegistry().document['purchases.refund_received'];
    expect(cfg?.header?.supplier?.required).toBe(true);
    expect(cfg?.header?.cashRegister?.required).toBeFalsy();
    expect(cfg?.lines ?? {}).toEqual({});
  });

  it('posts to AP + cash_funds', () => {
    const cfg = getRegistry().document['purchases.refund_received'];
    const targets = Object.keys(cfg?.posting ?? {});
    expect(targets).toEqual(
      expect.arrayContaining(['purchases.accounts_payable', 'treasury.cash_funds']),
    );
  });

  it('emits a single negative-amount AP expense (opens debt back up)', async () => {
    const cfg = getRegistry().document['purchases.refund_received'];
    const fn = cfg?.posting['purchases.accounts_payable'];
    if (!fn) throw new Error('expected posting fn');
    const date = new Date('2026-05-22T00:00:00.000Z');
    const out = (await fn(
      {
        date,
        supplier: 'supp-1',
        amount: 40,
      } as never,
      {} as never,
    )) as Array<Record<string, unknown>>;
    expect(out).toHaveLength(1);
    expect(out[0]).toMatchObject({
      kind: 'expense',
      supplier: 'supp-1',
      amount: -40,
    });
  });

  it('cash_funds posting emits one income when cashRegister is set', async () => {
    const cfg = getRegistry().document['purchases.refund_received'];
    const fn = cfg?.posting['treasury.cash_funds'];
    if (!fn) throw new Error('expected posting fn');
    const out = (await fn(
      {
        date: new Date('2026-05-22T00:00:00.000Z'),
        supplier: 'supp-1',
        cashRegister: 'cash-1',
        amount: 10,
      } as never,
      {} as never,
    )) as Array<Record<string, unknown>>;
    expect(out).toHaveLength(1);
    expect(out[0]).toMatchObject({
      kind: 'income',
      cashRegister: 'cash-1',
      amount: 10,
    });
  });

  it('cash_funds posting returns [] when no cashRegister is set', async () => {
    const cfg = getRegistry().document['purchases.refund_received'];
    const fn = cfg?.posting['treasury.cash_funds'];
    if (!fn) throw new Error('expected posting fn');
    const out = (await fn(
      { date: new Date(), supplier: 'supp-1', amount: 10 } as never,
      {} as never,
    )) as Array<unknown>;
    expect(out).toEqual([]);
  });
});
