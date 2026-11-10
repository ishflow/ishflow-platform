import type { NavEntry } from '@/lib/generated/nav';
import type { AppContext } from '@/platform/auth/current-context';
import { describe, expect, it } from 'vitest';
import { filterNav } from './nav-permissions';

function makeCtx(perms: string[]): AppContext {
  return {
    user: { id: 'u1', email: 'u@example.com', name: 'User' },
    tenant: null,
    permissions: new Set(perms),
    membership: null,
    scopesByEntity: new Map(),
  } as unknown as AppContext;
}

const sampleEntries: NavEntry[] = [
  {
    kind: 'catalog',
    id: 'sales.customer',
    module: 'sales',
    name: 'customer',
    href: '/catalogs/sales.customer',
    label: { en: 'Customers' },
  },
  {
    kind: 'catalog',
    id: 'purchases.supplier',
    module: 'purchases',
    name: 'supplier',
    href: '/catalogs/purchases.supplier',
    label: { en: 'Suppliers' },
  },
  {
    kind: 'catalog',
    id: 'inventory.product',
    module: 'inventory',
    name: 'product',
    href: '/catalogs/inventory.product',
    label: { en: 'Products' },
  },
  {
    kind: 'document',
    id: 'sales.invoice',
    module: 'sales',
    name: 'invoice',
    href: '/documents/sales.invoice',
    label: { en: 'Sales Invoices' },
  },
  {
    kind: 'document',
    id: 'inventory.price_setting',
    module: 'inventory',
    name: 'price_setting',
    href: '/documents/inventory.price_setting',
    label: { en: 'Price Settings' },
  },
];

describe('filterNav', () => {
  it('shows all entries for owner', () => {
    const ctx = makeCtx(['*:*']);
    expect(filterNav(sampleEntries, ctx.permissions).length).toBe(sampleEntries.length);
  });

  it('shows only inventory for warehouse', () => {
    const ctx = makeCtx([
      'inventory.product:read',
      'inventory.warehouse:read',
      'inventory.warehouse_stock:read',
    ]);
    const filtered = filterNav(sampleEntries, ctx.permissions);
    const ids = filtered.map((e) => e.id);
    expect(ids).toContain('inventory.product');
    expect(ids).not.toContain('sales.customer');
    expect(ids).not.toContain('sales.invoice');
  });

  it('shows sales entries for sales rep', () => {
    const ctx = makeCtx(['sales.customer:read', 'sales.invoice:read']);
    const filtered = filterNav(sampleEntries, ctx.permissions);
    const ids = filtered.map((e) => e.id);
    expect(ids).toContain('sales.customer');
    expect(ids).toContain('sales.invoice');
    expect(ids).not.toContain('purchases.supplier');
  });

  it('defaults unknown entries to visible', () => {
    const ctx = makeCtx([]);
    const entriesWithUnknown: NavEntry[] = [
      ...sampleEntries,
      {
        kind: 'catalog',
        id: 'unknown.future',
        module: 'unknown',
        name: 'future',
        href: '/catalogs/unknown.future',
        label: { en: 'Future' },
      },
    ];
    const filtered = filterNav(entriesWithUnknown, ctx.permissions);
    expect(filtered.some((e) => e.id === 'unknown.future')).toBe(true);
  });
});
