import type { AppContext } from '@/platform/auth/current-context';
import { describe, expect, it } from 'vitest';
import { MOBILE_FAB_ACTIONS, MOBILE_TABS, selectFabActions, selectTabs } from './tab-registry';

function makeCtx(
  perms: string[],
  opts?: {
    roles?: Array<{ name: string }>;
    mobileFeatures?: Record<string, boolean>;
  },
): AppContext {
  return {
    user: { id: 'u1', email: 'u@example.com', name: 'User' },
    tenant: opts?.mobileFeatures
      ? ({ id: 't1', mobileFeatures: opts.mobileFeatures } as unknown as AppContext['tenant'])
      : ({ id: 't1' } as unknown as AppContext['tenant']),
    permissions: new Set(perms),
    membership: opts?.roles ? ({ roles: opts.roles } as unknown as AppContext['membership']) : null,
    scopesByEntity: new Map(),
  } as unknown as AppContext;
}

describe('selectTabs', () => {
  it('returns home + docs + stock + cari for owner', () => {
    const ctx = makeCtx(['*:*'], { roles: [{ name: 'owner' }] });
    const tabs = selectTabs(ctx);
    const ids = tabs.map((t) => t.id);
    expect(ids).toContain('home');
    expect(ids).toContain('docs');
    expect(ids).toContain('stock');
    expect(ids).toContain('cari');
  });

  it('returns home + docs + stock + cari for bookkeeper', () => {
    const ctx = makeCtx(
      [
        '*:read',
        'sales.invoice:write',
        'purchases.invoice:write',
        'sales.payment_received:write',
        'purchases.payment_sent:write',
      ],
      { roles: [{ name: 'bookkeeper' }] },
    );
    const tabs = selectTabs(ctx);
    const ids = tabs.map((t) => t.id);
    expect(ids).toContain('home');
    expect(ids).toContain('docs');
    expect(ids).toContain('stock');
    expect(ids).toContain('cari');
  });

  it('returns home + docs + stock + cari for sales', () => {
    const ctx = makeCtx(
      [
        'sales.customer:read',
        'sales.invoice:read',
        'sales.payment_received:read',
        'inventory.warehouse_stock:read',
      ],
      { roles: [{ name: 'sales' }] },
    );
    const tabs = selectTabs(ctx);
    const ids = tabs.map((t) => t.id);
    expect(ids).toContain('home');
    expect(ids).toContain('docs');
    expect(ids).toContain('stock');
    expect(ids).toContain('cari');
  });

  it('returns home + stock for warehouse (no docs, no cari)', () => {
    const ctx = makeCtx(
      [
        'inventory.product:read',
        'inventory.warehouse:read',
        'inventory.warehouse_stock:read',
        'inventory.warehouse_stock:write',
      ],
      { roles: [{ name: 'warehouse' }] },
    );
    const tabs = selectTabs(ctx);
    const ids = tabs.map((t) => t.id);
    expect(ids).toContain('home');
    expect(ids).toContain('stock');
    expect(ids).not.toContain('docs');
    expect(ids).not.toContain('cari');
  });

  it('returns home + docs + stock + cari for viewer (read-only)', () => {
    const ctx = makeCtx(['*:read'], { roles: [{ name: 'viewer' }] });
    const tabs = selectTabs(ctx);
    const ids = tabs.map((t) => t.id);
    expect(ids).toContain('home');
    expect(ids).toContain('docs');
    expect(ids).toContain('stock');
    expect(ids).toContain('cari');
  });

  it('hides docs when sales mobile feature is disabled', () => {
    const ctx = makeCtx(['*:*'], { roles: [{ name: 'owner' }], mobileFeatures: { sales: false } });
    const tabs = selectTabs(ctx);
    const ids = tabs.map((t) => t.id);
    expect(ids).not.toContain('docs');
    expect(ids).not.toContain('cari');
    expect(ids).toContain('home');
    expect(ids).toContain('stock');
  });

  it('hides stock when inventory mobile feature is disabled', () => {
    const ctx = makeCtx(['*:*'], { roles: [{ name: 'owner' }], mobileFeatures: { inventory: false } });
    const tabs = selectTabs(ctx);
    const ids = tabs.map((t) => t.id);
    expect(ids).not.toContain('stock');
    expect(ids).toContain('home');
    expect(ids).toContain('docs');
    expect(ids).toContain('cari');
  });

  it('orders warehouse stock tab before docs (warehouse role)', () => {
    const ctx = makeCtx(
      [
        'inventory.warehouse_stock:read',
        'inventory.warehouse_stock:write',
        'sales.invoice:read',
      ],
      { roles: [{ name: 'warehouse' }] },
    );
    const tabs = selectTabs(ctx);
    const stockOrder = tabs.find((t) => t.id === 'stock')?.order;
    const docsOrder = tabs.find((t) => t.id === 'docs')?.order;
    expect(stockOrder).toBeLessThan(docsOrder ?? Number.POSITIVE_INFINITY);
  });
});

describe('selectFabActions', () => {
  it('returns all actions for owner', () => {
    const ctx = makeCtx(['*:*'], { roles: [{ name: 'owner' }] });
    const actions = selectFabActions(ctx);
    const ids = actions.map((a) => a.id);
    expect(ids).toContain('salesInvoice');
    expect(ids).toContain('paymentReceived');
    expect(ids).toContain('purchaseInvoice');
    expect(ids).toContain('paymentSent');
    expect(ids).toContain('stockIn');
    expect(ids).toContain('stockOut');
    expect(ids).toContain('customer');
  });

  it('returns sales + payment actions for sales rep', () => {
    const ctx = makeCtx(
      [
        'sales.invoice:write',
        'sales.payment_received:write',
        'sales.customer:write',
      ],
      { roles: [{ name: 'sales' }] },
    );
    const actions = selectFabActions(ctx);
    const ids = actions.map((a) => a.id);
    expect(ids).toContain('salesInvoice');
    expect(ids).toContain('paymentReceived');
    expect(ids).toContain('customer');
    expect(ids).not.toContain('purchaseInvoice');
    expect(ids).not.toContain('paymentSent');
    expect(ids).not.toContain('stockIn');
    expect(ids).not.toContain('stockOut');
  });

  it('returns stock actions for warehouse', () => {
    const ctx = makeCtx(['inventory.warehouse_stock:write'], { roles: [{ name: 'warehouse' }] });
    const actions = selectFabActions(ctx);
    const ids = actions.map((a) => a.id);
    expect(ids).toContain('stockIn');
    expect(ids).toContain('stockOut');
    expect(ids).not.toContain('salesInvoice');
    expect(ids).not.toContain('purchaseInvoice');
  });

  it('returns empty array for viewer (no write perms)', () => {
    const ctx = makeCtx(['*:read'], { roles: [{ name: 'viewer' }] });
    const actions = selectFabActions(ctx);
    expect(actions).toHaveLength(0);
  });

  it('returns empty array when no write permissions at all', () => {
    const ctx = makeCtx(['sales.invoice:read', 'inventory.warehouse_stock:read']);
    const actions = selectFabActions(ctx);
    expect(actions).toHaveLength(0);
  });
});

describe('registry constants', () => {
  it('MOBILE_TABS has expected ids', () => {
    const ids = MOBILE_TABS.map((t) => t.id);
    expect(ids).toEqual(['home', 'docs', 'stock', 'cari']);
  });

  it('MOBILE_FAB_ACTIONS has expected ids', () => {
    const ids = MOBILE_FAB_ACTIONS.map((a) => a.id);
    expect(ids).toEqual([
      'salesInvoice',
      'paymentReceived',
      'purchaseInvoice',
      'paymentSent',
      'stockIn',
      'stockOut',
      'customer',
    ]);
  });
});

describe('orderByRole — new system roles', () => {
  const NEW_ROLES = ['chief_accountant', 'cashier', 'buyer'] as const;
  const TABS_WITH_ORDER = MOBILE_TABS.filter((t) => t.orderByRole);

  it.each(NEW_ROLES)('every ordered tab has an entry for %s', (role) => {
    for (const tab of TABS_WITH_ORDER) {
      expect(tab.orderByRole?.[role], `tab ${tab.id} missing order for ${role}`).toBeTypeOf(
        'number',
      );
    }
  });

  it('drops obsolete manager/user role entries', () => {
    for (const tab of TABS_WITH_ORDER) {
      expect(tab.orderByRole).not.toHaveProperty('manager');
      expect(tab.orderByRole).not.toHaveProperty('user');
    }
  });
});
