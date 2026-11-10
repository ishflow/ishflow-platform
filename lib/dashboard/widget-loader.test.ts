import type { AppContext } from '@/platform/auth/current-context';
import { describe, expect, it } from 'vitest';
import { orderedSlots, selectWidgets } from './widget-loader';
import { WIDGET_REGISTRY } from './widget-registry.data';

function makeCtx(perms: string[]): AppContext {
  return {
    user: { id: 'u1', email: 'u@example.com', name: 'User' },
    tenant: null,
    permissions: new Set(perms),
    membership: null,
    scopesByEntity: new Map(),
  } as unknown as AppContext;
}

describe('selectWidgets', () => {
  it('returns all widgets for owner with *:*', () => {
    const ctx = makeCtx(['*:*']);
    const selected = selectWidgets(ctx, WIDGET_REGISTRY);
    const total = Object.values(selected).flat().length;
    expect(total).toBe(WIDGET_REGISTRY.length);
  });

  it('promotes kpi.cashPosition to first hero widget', () => {
    const ctx = makeCtx(['*:*']);
    const selected = selectWidgets(ctx, WIDGET_REGISTRY);
    expect(selected.hero[0]?.id).toBe('kpi.cashPosition');
  });

  it('shows only inventory widgets for warehouse role', () => {
    const ctx = makeCtx([
      'inventory.product:read',
      'inventory.warehouse:read',
      'inventory.warehouse_stock:read',
      'inventory.warehouse_stock:write',
    ]);
    const selected = selectWidgets(ctx, WIDGET_REGISTRY);
    const ids = Object.values(selected)
      .flat()
      .map((w) => w.id);

    expect(ids).toContain('action.lowStock');
    expect(ids).not.toContain('kpi.receivables');
    expect(ids).not.toContain('kpi.stockValue'); // dropped
    expect(ids).not.toContain('quick.newStockMovement'); // dropped
    expect(ids).not.toContain('chart.stockTrend'); // dropped
  });

  it('shows sales widgets for sales rep', () => {
    const ctx = makeCtx([
      'sales.customer:read',
      'sales.invoice:read',
      'sales.invoice:write',
      'sales.payment_received:write',
    ]);
    const selected = selectWidgets(ctx, WIDGET_REGISTRY);
    const ids = Object.values(selected)
      .flat()
      .map((w) => w.id);

    expect(ids).toContain('kpi.receivables');
    expect(ids).toContain('kpi.thisMonthSales');
    expect(ids).toContain('kpi.openInvoices');
    expect(ids).not.toContain('kpi.payables');
    expect(ids).not.toContain('quick.newSalesInvoice'); // dropped
    expect(ids).not.toContain('chart.trend30d'); // dropped
  });

  it('hides quick + chart slots entirely', () => {
    const ctx = makeCtx(['*:*']);
    const selected = selectWidgets(ctx, WIDGET_REGISTRY);
    expect(selected.quick).toHaveLength(0);
    expect(selected.trends).toHaveLength(0);
  });

  it('groups widgets by slot deterministically', () => {
    const ctx = makeCtx(['*:*']);
    const selected = selectWidgets(ctx, WIDGET_REGISTRY);
    expect(selected.hero.length).toBeGreaterThan(0);
    expect(selected.actions.length).toBeGreaterThan(0);
    expect(selected.activity.length).toBeGreaterThan(0);

    const heroIds = selected.hero.map((w) => w.id);
    const registryHeroIds = WIDGET_REGISTRY.filter((w) => w.slot === 'hero').map((w) => w.id);
    expect(heroIds).toEqual(registryHeroIds);
  });
});

describe('orderedSlots', () => {
  it('filters out empty slots', () => {
    const ctx = makeCtx(['inventory.warehouse_stock:read']);
    const selected = selectWidgets(ctx, WIDGET_REGISTRY);
    const slots = orderedSlots(selected);
    expect(slots).not.toContain('quick');
    expect(slots).not.toContain('trends');
  });

  it('preserves canonical order (hero → actions → activity)', () => {
    const ctx = makeCtx(['*:*']);
    const selected = selectWidgets(ctx, WIDGET_REGISTRY);
    const slots = orderedSlots(selected);
    expect(slots).toEqual(['hero', 'actions', 'activity']);
  });
});
