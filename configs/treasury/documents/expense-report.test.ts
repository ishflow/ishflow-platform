import { describe, expect, it } from 'vitest';
import './expense-report';
import { getRegistry } from '@/platform/metadata';

describe('treasury.expense_report document config', () => {
  it('is registered in the metadata registry', () => {
    expect(getRegistry().document['treasury.expense_report']).toBeDefined();
  });

  it('exposes optional cashRegister reference', () => {
    const cr = getRegistry().document['treasury.expense_report']?.header?.cashRegister;
    expect(cr?.type).toBe('reference');
    if (cr?.type === 'reference') {
      expect(cr.to).toEqual({ kind: 'ref', module: 'treasury', name: 'cash_register' });
    }
  });

  it('items line section requires amount + has category/description/receipt strings', () => {
    const items = getRegistry().document['treasury.expense_report']?.lines?.items;
    expect(items?.minRows).toBe(1);
    expect(items?.fields?.amount?.required).toBe(true);
    expect(items?.fields?.category?.type).toBe('string');
    expect(items?.fields?.description?.type).toBe('string');
    expect(items?.fields?.receipt?.type).toBe('string');
  });

  it('posts ONLY to treasury.cash_funds', () => {
    const cfg = getRegistry().document['treasury.expense_report'];
    expect(Object.keys(cfg?.posting ?? {})).toEqual(['treasury.cash_funds']);
  });

  it('posting mapper emits one expense movement per non-zero line', async () => {
    const cfg = getRegistry().document['treasury.expense_report'];
    const fn = cfg?.posting['treasury.cash_funds'];
    expect(fn).toBeDefined();
    if (!fn) throw new Error('expected posting fn');
    const date = new Date('2026-05-22T00:00:00.000Z');
    const out = (await fn(
      {
        date,
        cashRegister: 'cash-1',
        lines: {
          items: [{ amount: 12.34 }, { amount: 0 }, { amount: 50 }],
        },
      } as never,
      {} as never,
    )) as Array<Record<string, unknown>>;
    expect(out).toHaveLength(2);
    expect(out[0]).toMatchObject({
      kind: 'expense',
      cashRegister: 'cash-1',
      amount: 12.34,
    });
    expect(out[1]).toMatchObject({
      kind: 'expense',
      cashRegister: 'cash-1',
      amount: 50,
    });
  });

  it('posting returns [] when cashRegister is missing', async () => {
    const cfg = getRegistry().document['treasury.expense_report'];
    const fn = cfg?.posting['treasury.cash_funds'];
    if (!fn) throw new Error('expected posting fn');
    const out = (await fn(
      {
        date: new Date(),
        lines: { items: [{ amount: 10 }] },
      } as never,
      {} as never,
    )) as Array<unknown>;
    expect(out).toEqual([]);
  });
});
