import { describe, expect, it } from 'vitest';
import './debt-adjustment';
import { getRegistry } from '@/platform/metadata';

describe('treasury.debt_adjustment document config', () => {
  it('is registered in the metadata registry', () => {
    expect(getRegistry().document['treasury.debt_adjustment']).toBeDefined();
  });

  it('declares kind as a 3-value enum (netting/writeoff/transfer)', () => {
    const k = getRegistry().document['treasury.debt_adjustment']?.header?.kind;
    expect(k?.type).toBe('string');
    expect(k?.required).toBe(true);
    if (k?.type === 'string') {
      expect(k.enumValues).toEqual(['netting', 'writeoff', 'transfer']);
    }
  });

  it('declares counterpartyKind as a 2-value enum (customer/supplier)', () => {
    const ck = getRegistry().document['treasury.debt_adjustment']?.header?.counterpartyKind;
    expect(ck?.type).toBe('string');
    expect(ck?.required).toBe(true);
    if (ck?.type === 'string') {
      expect(ck.enumValues).toEqual(['customer', 'supplier']);
    }
  });

  it('posts to BOTH sales.accounts_receivable + purchases.accounts_payable', () => {
    const cfg = getRegistry().document['treasury.debt_adjustment'];
    const targets = Object.keys(cfg?.posting ?? {}).sort();
    expect(targets).toEqual(['purchases.accounts_payable', 'sales.accounts_receivable']);
  });

  it('declares items section with originalDocRef + originalDocType + amount', () => {
    const items = getRegistry().document['treasury.debt_adjustment']?.lines?.items;
    expect(items).toBeDefined();
    expect(items?.minRows).toBe(1);
    expect(Object.keys(items?.fields ?? {}).sort()).toEqual([
      'amount',
      'originalDocRef',
      'originalDocType',
    ]);
  });

  it('AR mapper returns [] when counterpartyKind=supplier', async () => {
    const fn =
      getRegistry().document['treasury.debt_adjustment']?.posting['sales.accounts_receivable'];
    if (!fn) throw new Error('expected AR mapper');
    const out = (await fn(
      {
        date: new Date('2026-05-22'),
        counterpartyKind: 'supplier',
        counterparty: 'sup-1',
        lines: { items: [{ originalDocRef: 'd-1', originalDocType: 'X', amount: 100 }] },
      } as never,
      {} as never,
    )) as Array<unknown>;
    expect(out).toEqual([]);
  });

  it('AR mapper emits expense rows that close customer balance', async () => {
    const fn =
      getRegistry().document['treasury.debt_adjustment']?.posting['sales.accounts_receivable'];
    if (!fn) throw new Error('expected AR mapper');
    const out = (await fn(
      {
        date: new Date('2026-05-22T00:00:00.000Z'),
        counterpartyKind: 'customer',
        counterparty: 'cust-1',
        lines: {
          items: [{ originalDocRef: 'inv-1', originalDocType: 'sales.invoice', amount: 100 }],
        },
      } as never,
      {} as never,
    )) as Array<Record<string, unknown>>;
    expect(out).toHaveLength(1);
    expect(out[0]).toMatchObject({
      kind: 'expense',
      customer: 'cust-1',
      relatedDocRef: 'inv-1',
      amount: 100,
    });
  });

  it('AP mapper returns [] when counterpartyKind=customer', async () => {
    const fn =
      getRegistry().document['treasury.debt_adjustment']?.posting['purchases.accounts_payable'];
    if (!fn) throw new Error('expected AP mapper');
    const out = (await fn(
      {
        date: new Date('2026-05-22'),
        counterpartyKind: 'customer',
        counterparty: 'cust-1',
        lines: { items: [{ originalDocRef: 'd-1', originalDocType: 'X', amount: 100 }] },
      } as never,
      {} as never,
    )) as Array<unknown>;
    expect(out).toEqual([]);
  });

  it('AP mapper emits expense rows that close supplier balance', async () => {
    const fn =
      getRegistry().document['treasury.debt_adjustment']?.posting['purchases.accounts_payable'];
    if (!fn) throw new Error('expected AP mapper');
    const out = (await fn(
      {
        date: new Date('2026-05-22T00:00:00.000Z'),
        counterpartyKind: 'supplier',
        counterparty: 'sup-1',
        lines: {
          items: [{ originalDocRef: 'pi-1', originalDocType: 'purchases.invoice', amount: 200 }],
        },
      } as never,
      {} as never,
    )) as Array<Record<string, unknown>>;
    expect(out).toHaveLength(1);
    expect(out[0]).toMatchObject({
      kind: 'expense',
      supplier: 'sup-1',
      relatedDocRef: 'pi-1',
      amount: 200,
    });
  });
});
