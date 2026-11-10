import type { LocalizedLabel } from './types';

/**
 * Lightweight DSL for the V2 dashboard. Each widget declares a loader
 * (RSC, may await + use withTenant) and a renderer id mapped to a
 * client component in `components/v2/dashboard/renderers/`. Loaders
 * must return JSON-serializable payloads — no function references — so
 * RSC can hand the payload to a client renderer without complaining.
 */

export type DashboardWidgetCtx = {
  tenant: { id: string; locale: string; currency: string };
};

export type DashboardWidgetLayout = 'full-row' | 'half-row' | 'third-row';

export type DashboardWidgetConfig<TPayload = unknown> = {
  id: string;
  title: LocalizedLabel;
  layout: DashboardWidgetLayout;
  loader: (ctx: DashboardWidgetCtx) => Promise<TPayload>;
  renderer: string;
  permissions?: { read: 'any' | 'tenant' };
  /**
   * Permission code(s) gating this widget. A string is a single code; an array
   * is ANY-of. Omitted → visible to everyone. Filtered against the signed-in
   * user's permissions so a warehouse clerk doesn't see financial KPIs (SoD).
   */
  requires?: string | string[];
};

/**
 * Slot in the dashboard order. A plain string ID renders the widget on
 * its own row; an array of IDs renders them side-by-side via `.grid-2`.
 */
export type DashboardOrderSlot = string | string[];

const widgetRegistry = new Map<string, DashboardWidgetConfig>();
const orderRegistry: { value: DashboardOrderSlot[] | null } = { value: null };

export function defineDashboardWidget<T>(config: DashboardWidgetConfig<T>): void {
  if (widgetRegistry.has(config.id)) {
    throw new Error(`Dashboard widget "${config.id}" already registered`);
  }
  widgetRegistry.set(config.id, config as DashboardWidgetConfig);
}

export function defineDashboardOrder(order: DashboardOrderSlot[]): void {
  orderRegistry.value = order;
}

export function getDashboardRegistry(): {
  widgets: Map<string, DashboardWidgetConfig>;
  order: DashboardOrderSlot[] | null;
} {
  return { widgets: widgetRegistry, order: orderRegistry.value };
}

/** Test-only helper to reset registry state between cases. */
export function clearDashboardRegistry(): void {
  widgetRegistry.clear();
  orderRegistry.value = null;
}
