import { hasPermission } from '@/platform/engine/permissions';
import { featureEnabled } from '@/platform/features/feature-flags';
import type { RailKey } from './active-rail';
import {
  PANELS,
  type PanelItem,
  type PanelSection,
  RAILS,
  type RailDef,
  type Requires,
} from './nav';

function ok(perms: Set<string>, req?: Requires): boolean {
  if (!req) return true;
  const list = Array.isArray(req) ? req : [req];
  return list.some((p) => hasPermission(perms, p));
}

// Feature gating is an AND on top of permissions. When `features` is undefined
// (RBAC-only callers / tests) no feature filtering happens; production passes
// the loaded set so absent keys are hidden (default OFF).
function featureOk(features: Set<string> | undefined, feature?: string): boolean {
  if (!features) return true;
  return featureEnabled(features, feature);
}

// An item passes when its own permission + feature gates pass. A parent item
// (one with `children`) ALSO requires at least one child to survive — its own
// page is just a redirect to a child, so an all-children-hidden parent is dead.
// Surviving children are filtered in place so child hrefs only land in
// `itemHrefs` (the panel allow-list) when the child itself is permitted.
function filterItem(
  perms: Set<string>,
  features: Set<string> | undefined,
  item: PanelItem,
): PanelItem | null {
  if (!(ok(perms, item.requires) && featureOk(features, item.feature))) return null;
  if (!item.children) return item;
  const children = item.children.filter(
    (c) => ok(perms, c.requires) && featureOk(features, c.feature),
  );
  if (children.length === 0) return null;
  return { ...item, children };
}

function filterPanels(
  perms: Set<string>,
  key: RailKey,
  features: Set<string> | undefined,
): PanelSection[] {
  return (PANELS[key] ?? [])
    .map((s) => ({
      ...s,
      items: s.items
        .map((i) => filterItem(perms, features, i))
        .filter((i): i is PanelItem => i !== null),
    }))
    .filter((s) => ok(perms, s.requires) && s.items.length > 0);
}

/**
 * Filter the curated nav down to what `perms` permits AND what `enabledFeatures`
 * allows. Pure + unit-tested. A rail survives when its own `requires` passes AND
 * either it's the always-on dashboard, it has no panel sections (none today), or
 * at least one of its sections survived — so we never render an empty rail.
 *
 * @param enabledFeatures Global feature-flag keys that are ON. Omit for
 *   RBAC-only filtering (no feature gating).
 */
export function buildNavForPermissions(
  perms: Set<string>,
  enabledFeatures?: Set<string>,
): {
  rails: RailDef[];
  panels: Partial<Record<RailKey, PanelSection[]>>;
} {
  const panels: Partial<Record<RailKey, PanelSection[]>> = {};
  const rails = RAILS.filter((rail) => {
    const sections = filterPanels(perms, rail.key, enabledFeatures);
    panels[rail.key] = sections;
    if (!ok(perms, rail.requires)) return false;
    if (rail.key === 'dashboard') return true;
    const hasPanels = (PANELS[rail.key]?.length ?? 0) > 0;
    return !hasPanels || sections.length > 0;
  });
  return { rails, panels };
}

/** First visible rail's href — the safe redirect target when a default rail is hidden. */
export function firstVisibleRailHref(rails: RailDef[]): string {
  return rails[0]?.href ?? '/dashboard';
}
