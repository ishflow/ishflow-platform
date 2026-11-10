import { describe, expect, it } from 'vitest';
import './bank-transfer';
import { getRegistry } from '@/platform/metadata';

describe('treasury.bank_transfer document config', () => {
  it('is registered in the metadata registry', () => {
    expect(getRegistry().document['treasury.bank_transfer']).toBeDefined();
  });

  it('has two required bank account references and no lines', () => {
    const cfg = getRegistry().document['treasury.bank_transfer'];
    expect(cfg?.header?.fromBank?.required).toBe(true);
    expect(cfg?.header?.toBank?.required).toBe(true);
    expect(cfg?.lines ?? {}).toEqual({});
  });

  it('posts ONLY to treasury.bank_funds', () => {
    const cfg = getRegistry().document['treasury.bank_transfer'];
    expect(Object.keys(cfg?.posting ?? {})).toEqual(['treasury.bank_funds']);
  });

  it('emits a paired expense+income to bank_funds', async () => {
    const cfg = getRegistry().document['treasury.bank_transfer'];
    const fn = cfg?.posting['treasury.bank_funds'];
    expect(fn).toBeDefined();
    if (!fn) throw new Error('expected posting fn');
    const date = new Date('2026-05-22T00:00:00.000Z');
    const out = (await fn(
      {
        date,
        fromBank: 'bank-1',
        toBank: 'bank-2',
        amount: 50,
      } as never,
      {} as never,
    )) as Array<Record<string, unknown>>;
    expect(out).toHaveLength(2);
    expect(out[0]).toMatchObject({
      kind: 'expense',
      bankAccount: 'bank-1',
      amount: 50,
    });
    expect(out[1]).toMatchObject({
      kind: 'income',
      bankAccount: 'bank-2',
      amount: 50,
    });
  });

  it('posting returns [] when amount is 0', async () => {
    const cfg = getRegistry().document['treasury.bank_transfer'];
    const fn = cfg?.posting['treasury.bank_funds'];
    if (!fn) throw new Error('expected posting fn');
    const out = (await fn(
      {
        date: new Date(),
        fromBank: 'bank-1',
        toBank: 'bank-2',
        amount: 0,
      } as never,
      {} as never,
    )) as Array<unknown>;
    expect(out).toEqual([]);
  });

  it('prePost validator rejects when fromBank === toBank', async () => {
    const cfg = getRegistry().document['treasury.bank_transfer'];
    const validator = cfg?.validators?.prePost?.[0];
    expect(validator).toBeDefined();
    const sameId = '11111111-1111-1111-1111-111111111111';
    const result = await validator?.({ fromBank: sameId, toBank: sameId } as never, {} as never);
    expect(result).toEqual({ ok: false, message: 'BANK_ACCOUNT_SAME' });
  });

  it('prePost validator accepts different bank accounts', async () => {
    const cfg = getRegistry().document['treasury.bank_transfer'];
    const validator = cfg?.validators?.prePost?.[0];
    const result = await validator?.(
      {
        fromBank: '11111111-1111-1111-1111-111111111111',
        toBank: '22222222-2222-2222-2222-222222222222',
      } as never,
      {} as never,
    );
    expect(result).toEqual({ ok: true });
  });
});
