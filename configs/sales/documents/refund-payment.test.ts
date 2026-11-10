import { describe, expect, it } from 'vitest';
import './refund-payment';
import { getRegistry } from '@/platform/metadata';

describe('sales.refund_payment document config', () => {
  it('is registered in the metadata registry', () => {
    expect(getRegistry().document['sales.refund_payment']).toBeDefined();
  });

  it('has required customer + optional cashRegister; no lines', () => {
    const cfg = getRegistry().document['sales.refund_payment'];
    expect(cfg?.header?.customer?.required).toBe(true);
    expect(cfg?.header?.cashRegister?.required).toBeFalsy();
    expect(cfg?.lines ?? {}).toEqual({});
  });

  it('posts to AR + cash_funds', () => {
    const cfg = getRegistry().document['sales.refund_payment'];
    const targets = Object.keys(cfg?.posting ?? {});
    expect(targets).toEqual(
      expect.arrayContaining(['sales.accounts_receivable', 'treasury.cash_funds']),
    );
  });

  it('emits a single negative-amount AR expense (opens debt back up)', async () => {
    const cfg = getRegistry().document['sales.refund_payment'];
    const fn = cfg?.posting['sales.accounts_receivable'];
    if (!fn) throw new Error('expected posting fn');
    const date = new Date('2026-05-22T00:00:00.000Z');
    const out = (await fn(
      {
        date,
        customer: 'cust-1',
        amount: 25,
      } as never,
      {} as never,
    )) as Array<Record<string, unknown>>;
    expect(out).toHaveLength(1);
    expect(out[0]).toMatchObject({
      kind: 'expense',
      customer: 'cust-1',
      amount: -25,
    });
  });

  it('cash_funds posting returns [] when no cashRegister is set', async () => {
    const cfg = getRegistry().document['sales.refund_payment'];
    const fn = cfg?.posting['treasury.cash_funds'];
    if (!fn) throw new Error('expected posting fn');
    const out = (await fn(
      { date: new Date(), customer: 'cust-1', amount: 10 } as never,
      {} as never,
    )) as Array<unknown>;
    expect(out).toEqual([]);
  });

  it('cash_funds posting emits one expense when cashRegister is set', async () => {
    const cfg = getRegistry().document['sales.refund_payment'];
    const fn = cfg?.posting['treasury.cash_funds'];
    if (!fn) throw new Error('expected posting fn');
    const out = (await fn(
      {
        date: new Date('2026-05-22T00:00:00.000Z'),
        customer: 'cust-1',
        cashRegister: 'cash-1',
        amount: 10,
      } as never,
      {} as never,
    )) as Array<Record<string, unknown>>;
    expect(out).toHaveLength(1);
    expect(out[0]).toMatchObject({
      kind: 'expense',
      cashRegister: 'cash-1',
      amount: 10,
    });
  });
});
