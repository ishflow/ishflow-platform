import type { AppContext } from '@/platform/auth/current-context';
import { describe, expect, it } from 'vitest';
import { redactFinancialFields } from './redact-financial';

function ctxWith(perms: string[]): AppContext {
  return {
    user: { id: 'u1' } as never,
    tenant: { id: 't1' } as never,
    membership: { id: 'm1' } as never,
    permissions: new Set(perms),
    scopesByEntity: new Map(),
    addons: new Set(),
  };
}

describe('redactFinancialFields', () => {
  it('returns payload unchanged when user has financial write permission', () => {
    const ctx = ctxWith(['sales.invoice:write']);
    const payload = { unitPrice: 100, total: 200, name: 'Widget' };
    expect(redactFinancialFields(payload, ctx)).toEqual(payload);
  });

  it('returns payload unchanged for owner with *:*', () => {
    const ctx = ctxWith(['*:*']);
    const payload = { unitPrice: 100, total: 200, name: 'Widget' };
    expect(redactFinancialFields(payload, ctx)).toEqual(payload);
  });

  it('strips financial fields for warehouse user (no financial write)', () => {
    const ctx = ctxWith(['inventory.product:read', 'sales.invoice:read']);
    const payload = { unitPrice: 100, total: 200, name: 'Widget' };
    expect(redactFinancialFields(payload, ctx)).toEqual({ name: 'Widget' });
  });

  it('strips nested line fields', () => {
    const ctx = ctxWith(['inventory.product:read']);
    const payload = {
      name: 'Invoice',
      lines: {
        items: [
          { product: 'A', quantity: 2, unitPrice: 50, lineTotal: 100 },
          { product: 'B', quantity: 1, price: 30 },
        ],
      },
    };
    expect(redactFinancialFields(payload, ctx)).toEqual({
      name: 'Invoice',
      lines: {
        items: [
          { product: 'A', quantity: 2 },
          { product: 'B', quantity: 1, price: 30 },
        ],
      },
    });
  });

  it('redacts for bookkeeper with only purchases.invoice:read (no write)', () => {
    const ctx = ctxWith(['purchases.invoice:read']);
    const payload = { unitPrice: 100, total: 200 };
    expect(redactFinancialFields(payload, ctx)).toEqual({});
  });

  it('handles arrays of documents', () => {
    const ctx = ctxWith(['inventory.product:read']);
    const payload = [
      { id: '1', total: 100 },
      { id: '2', amount: 200 },
    ];
    expect(redactFinancialFields(payload, ctx)).toEqual([{ id: '1' }, { id: '2' }]);
  });

  it('does not mutate original payload', () => {
    const ctx = ctxWith(['inventory.product:read']);
    const payload = { unitPrice: 100, name: 'Widget' };
    const result = redactFinancialFields(payload, ctx);
    expect(payload).toEqual({ unitPrice: 100, name: 'Widget' });
    expect(result).toEqual({ name: 'Widget' });
  });
});
