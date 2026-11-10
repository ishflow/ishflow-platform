import '@/configs';
import { getRegistry } from '@/platform/metadata';
import { describe, expect, it } from 'vitest';

describe('purchases.payment_sent — kassa wiring', () => {
  it('is registered in the metadata registry', () => {
    expect(getRegistry().document['purchases.payment_sent']).toBeDefined();
  });

  it('posts to purchases.accounts_payable + treasury.cash_funds', () => {
    const config = getRegistry().document['purchases.payment_sent'];
    const targets = Object.keys(config?.posting ?? {});
    expect(targets).toEqual(
      expect.arrayContaining(['purchases.accounts_payable', 'treasury.cash_funds']),
    );
  });

  it('requires a cashRegister header reference', () => {
    const config = getRegistry().document['purchases.payment_sent'];
    const cr = config?.header?.cashRegister;
    expect(cr?.type).toBe('reference');
    expect(cr?.required).toBe(true);
    if (cr?.type === 'reference') {
      expect(cr.to).toEqual({ kind: 'ref', module: 'treasury', name: 'cash_register' });
    }
  });

  it('declares an INSUFFICIENT_CASH prePost validator that rejects when balance < amount', async () => {
    const config = getRegistry().document['purchases.payment_sent'];
    const validators = config?.validators?.prePost ?? [];
    expect(validators.length).toBeGreaterThan(0);
    const stubCtx = {
      register: () => ({
        balance: async () => ({ quantity: 0 }),
        balanceAll: async () => ({ amount: 0 }),
      }),
      tx: {
        catalog_treasury_cash_register: {
          findUnique: async () => ({ openingBalance: 0 }),
        },
        movement_treasury_cash_funds: {
          aggregate: async () => ({ _sum: { amount: 0 } }),
        },
      },
    } as unknown as Parameters<NonNullable<(typeof validators)[0]>>[1];

    const result = await validators[0]?.(
      {
        cashRegister: '11111111-1111-1111-1111-111111111111',
        amount: 250,
        date: new Date('2026-05-21'),
      } as never,
      stubCtx,
    );
    expect(result).toEqual({ ok: false, message: 'INSUFFICIENT_CASH' });
  });

  it('passes the prePost validator when balance >= amount', async () => {
    const config = getRegistry().document['purchases.payment_sent'];
    const validators = config?.validators?.prePost ?? [];
    const stubCtx = {
      register: () => ({
        balance: async () => ({ quantity: 0 }),
        balanceAll: async () => ({ amount: 1000 }),
      }),
      tx: {
        catalog_treasury_cash_register: {
          findUnique: async () => ({ openingBalance: 0 }),
        },
        movement_treasury_cash_funds: {
          aggregate: async (args: { where: { kind: string } }) => ({
            _sum: { amount: args.where.kind === 'income' ? 1000 : 0 },
          }),
        },
      },
    } as unknown as Parameters<NonNullable<(typeof validators)[0]>>[1];

    const result = await validators[0]?.(
      {
        cashRegister: '11111111-1111-1111-1111-111111111111',
        amount: 250,
        date: new Date('2026-05-21'),
      } as never,
      stubCtx,
    );
    expect(result).toEqual({ ok: true });
  });

  it('counts openingBalance toward on-hand when movements are zero', async () => {
    const config = getRegistry().document['purchases.payment_sent'];
    const validators = config?.validators?.prePost ?? [];
    const stubCtx = {
      register: () => ({
        balance: async () => ({ quantity: 0 }),
        balanceAll: async () => ({ amount: 0 }),
      }),
      tx: {
        catalog_treasury_cash_register: {
          findUnique: async () => ({ openingBalance: 1000 }),
        },
        movement_treasury_cash_funds: {
          aggregate: async () => ({ _sum: { amount: 0 } }),
        },
      },
    } as unknown as Parameters<NonNullable<(typeof validators)[0]>>[1];

    const result = await validators[0]?.(
      {
        cashRegister: '11111111-1111-1111-1111-111111111111',
        amount: 250,
        date: new Date('2026-05-21'),
      } as never,
      stubCtx,
    );
    expect(result).toEqual({ ok: true });
  });
});
