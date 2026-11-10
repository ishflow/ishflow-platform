import { describe, expect, it } from 'vitest';
import './cash-transfer';
import { getRegistry } from '@/platform/metadata';

describe('treasury.cash_transfer document config', () => {
  it('is registered in the metadata registry', () => {
    expect(getRegistry().document['treasury.cash_transfer']).toBeDefined();
  });

  it('has two required cash register references and no lines', () => {
    const cfg = getRegistry().document['treasury.cash_transfer'];
    expect(cfg?.header?.fromCashReg?.required).toBe(true);
    expect(cfg?.header?.toCashReg?.required).toBe(true);
    expect(cfg?.lines ?? {}).toEqual({});
  });

  it('posts ONLY to treasury.cash_funds', () => {
    const cfg = getRegistry().document['treasury.cash_transfer'];
    expect(Object.keys(cfg?.posting ?? {})).toEqual(['treasury.cash_funds']);
  });

  it('emits a paired expense+income to cash_funds', async () => {
    const cfg = getRegistry().document['treasury.cash_transfer'];
    const fn = cfg?.posting['treasury.cash_funds'];
    expect(fn).toBeDefined();
    if (!fn) throw new Error('expected posting fn');
    const date = new Date('2026-05-22T00:00:00.000Z');
    const out = (await fn(
      {
        date,
        fromCashReg: 'cash-1',
        toCashReg: 'cash-2',
        amount: 50,
      } as never,
      {} as never,
    )) as Array<Record<string, unknown>>;
    expect(out).toHaveLength(2);
    expect(out[0]).toMatchObject({
      kind: 'expense',
      cashRegister: 'cash-1',
      amount: 50,
    });
    expect(out[1]).toMatchObject({
      kind: 'income',
      cashRegister: 'cash-2',
      amount: 50,
    });
  });

  it('posting returns [] when amount is 0', async () => {
    const cfg = getRegistry().document['treasury.cash_transfer'];
    const fn = cfg?.posting['treasury.cash_funds'];
    if (!fn) throw new Error('expected posting fn');
    const out = (await fn(
      {
        date: new Date(),
        fromCashReg: 'cash-1',
        toCashReg: 'cash-2',
        amount: 0,
      } as never,
      {} as never,
    )) as Array<unknown>;
    expect(out).toEqual([]);
  });

  it('prePost validator rejects when fromCashReg === toCashReg', async () => {
    const cfg = getRegistry().document['treasury.cash_transfer'];
    const validator = cfg?.validators?.prePost?.[0];
    expect(validator).toBeDefined();
    const sameId = '11111111-1111-1111-1111-111111111111';
    const result = await validator?.(
      { fromCashReg: sameId, toCashReg: sameId } as never,
      {} as never,
    );
    expect(result).toEqual({ ok: false, message: 'CASH_REGISTER_SAME' });
  });

  it('prePost validator accepts different registers', async () => {
    const cfg = getRegistry().document['treasury.cash_transfer'];
    const validator = cfg?.validators?.prePost?.[0];
    const result = await validator?.(
      {
        fromCashReg: '11111111-1111-1111-1111-111111111111',
        toCashReg: '22222222-2222-2222-2222-222222222222',
      } as never,
      {} as never,
    );
    expect(result).toEqual({ ok: true });
  });
});
