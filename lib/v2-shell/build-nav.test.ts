import { SYSTEM_ROLE_DEFS, type SystemRoleName } from '@/platform/auth/seed-system-roles';
import { describe, expect, it } from 'vitest';
import { buildNavForPermissions, firstVisibleRailHref } from './build-nav';

function railsFor(role: SystemRoleName): string[] {
  const perms = new Set(SYSTEM_ROLE_DEFS[role].permissions);
  return buildNavForPermissions(perms).rails.map((r) => r.key);
}

describe('buildNavForPermissions — per-role rail visibility', () => {
  it('owner sees every rail', () => {
    expect(railsFor('owner')).toEqual([
      'dashboard',
      'catalogs',
      'documents',
      'registers',
      'reports',
      'addons',
      'admin',
      'settings',
    ]);
  });

  it('admin sees every rail', () => {
    expect(railsFor('admin')).toEqual([
      'dashboard',
      'catalogs',
      'documents',
      'registers',
      'reports',
      'addons',
      'admin',
      'settings',
    ]);
  });

  it('chief_accountant: operational + settings, no admin (FX finance section removed)', () => {
    // The chief_accountant's only admin section was finance (FX rates +
    // period-close FX). With multi-currency removed, that section is gone, so
    // the admin rail no longer appears for this role.
    expect(railsFor('chief_accountant')).toEqual([
      'dashboard',
      'catalogs',
      'documents',
      'registers',
      'reports',
      'settings',
    ]);
  });

  it.each(['bookkeeper', 'cashier', 'buyer', 'sales', 'warehouse', 'viewer'] as const)(
    '%s sees the operational rails but never admin / settings / addons',
    (role) => {
      const keys = railsFor(role);
      expect(keys).toEqual(['dashboard', 'catalogs', 'documents', 'registers', 'reports']);
      expect(keys).not.toContain('admin');
      expect(keys).not.toContain('settings');
      expect(keys).not.toContain('addons');
    },
  );

  it('viewer cannot reach the audit log (sealed) — no admin rail', () => {
    expect(railsFor('viewer')).not.toContain('admin');
  });
});

describe('buildNavForPermissions — panel contents', () => {
  it('warehouse: catalogs = products + warehouses only; documents = inventory only', () => {
    const perms = new Set(SYSTEM_ROLE_DEFS.warehouse.permissions);
    const { panels } = buildNavForPermissions(perms);

    const catalogItems = (panels.catalogs ?? []).flatMap((s) => s.items.map((i) => i.i18nKey));
    expect(catalogItems).toEqual(['catalogs.products', 'catalogs.warehouses']);

    const docSections = (panels.documents ?? []).map((s) => s.i18nKey);
    expect(docSections).toEqual(['documents.section.inventory']);
    const invItems = (panels.documents ?? [])[0]?.items.map((i) => i.i18nKey) ?? [];
    expect(invItems).toContain('documents.inventoryCount');
    expect(invItems).toContain('documents.stockAdjustment');
    expect(invItems).toContain('documents.stockTransfer');
    expect(invItems).not.toContain('documents.priceSetting'); // pricing, not stock
  });

  it('warehouse reports = inventory only (no financial/sales)', () => {
    const perms = new Set(SYSTEM_ROLE_DEFS.warehouse.permissions);
    const { panels } = buildNavForPermissions(perms);
    const reportItems = (panels.reports ?? []).flatMap((s) => s.items.map((i) => i.i18nKey));
    expect(reportItems).toContain('reports.productCard');
    expect(reportItems).toContain('reports.inventoryValuation');
    expect(reportItems).not.toContain('reports.grossProfit');
    expect(reportItems).not.toContain('reports.incomeStatement');
  });

  it('sales: documents = sales section only (no purchases)', () => {
    const perms = new Set(SYSTEM_ROLE_DEFS.sales.permissions);
    const { panels } = buildNavForPermissions(perms);
    const docSections = (panels.documents ?? []).map((s) => s.i18nKey);
    expect(docSections).toContain('documents.section.sales');
    expect(docSections).not.toContain('documents.section.purchases');
  });

  it('chief_accountant has no admin panel (FX finance section removed; lacks audit / members)', () => {
    const perms = new Set(SYSTEM_ROLE_DEFS.chief_accountant.permissions);
    const { panels } = buildNavForPermissions(perms);
    // Finance (FX rates + period-close FX) was their only admin section; gone now.
    const adminSections = (panels.admin ?? []).map((s) => s.i18nKey);
    expect(adminSections).toEqual([]);
  });

  it('owner: Turnover parent carries all four child sub-reports', () => {
    const perms = new Set(SYSTEM_ROLE_DEFS.owner.permissions);
    const { panels } = buildNavForPermissions(perms);
    const turnover = (panels.reports ?? [])
      .flatMap((s) => s.items)
      .find((i) => i.i18nKey === 'reports.turnover');
    expect(turnover?.children?.map((c) => c.href)).toEqual([
      '/reports/turnover/receivable',
      '/reports/turnover/payable',
      '/reports/turnover/sales',
      '/reports/turnover/stock',
    ]);
  });

  it('warehouse: Turnover shows but is pruned to the inventory child only', () => {
    const perms = new Set(SYSTEM_ROLE_DEFS.warehouse.permissions);
    const { panels } = buildNavForPermissions(perms);
    const turnover = (panels.reports ?? [])
      .flatMap((s) => s.items)
      .find((i) => i.i18nKey === 'reports.turnover');
    // Warehouse has inventory reports but not financial/sales — only the stock
    // child survives, so the parent stays (it has a permitted child).
    expect(turnover?.children?.map((c) => c.href)).toEqual(['/reports/turnover/stock']);
  });

  it('firstVisibleRailHref falls back to the first visible rail', () => {
    const perms = new Set(SYSTEM_ROLE_DEFS.warehouse.permissions);
    const { rails } = buildNavForPermissions(perms);
    expect(firstVisibleRailHref(rails)).toBe('/dashboard');
  });
});

describe('buildNavForPermissions — feature flags', () => {
  const ownerPerms = () => new Set(SYSTEM_ROLE_DEFS.owner.permissions);
  const catalogItems = (perms: Set<string>, features?: Set<string>) =>
    (buildNavForPermissions(perms, features).panels.catalogs ?? []).flatMap((s) =>
      s.items.map((i) => i.i18nKey),
    );

  it('hides a feature-gated item when its key is absent — even for owner', () => {
    expect(catalogItems(ownerPerms(), new Set())).not.toContain('catalogs.fixedAssets');
  });

  it('shows a feature-gated item when its key is enabled', () => {
    expect(catalogItems(ownerPerms(), new Set(['assets.fixed_asset']))).toContain(
      'catalogs.fixedAssets',
    );
  });

  it('leaves items without a feature key unaffected by the feature set', () => {
    expect(catalogItems(ownerPerms(), new Set())).toContain('catalogs.products');
  });

  it('omitting enabledFeatures keeps all items (RBAC-only, backward-compatible)', () => {
    expect(catalogItems(ownerPerms())).toContain('catalogs.fixedAssets');
  });
});
