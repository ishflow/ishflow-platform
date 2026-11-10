/**
 * Targeting filter for `MarketingAnnouncement.targeting` JSON.
 *
 * Each axis (plans, addons, roles, locales, tenantIds) is an optional
 * string list. An empty / missing list means "no filter on this axis"; a
 * non-empty list means "viewer must match at least one entry".
 *
 * Pure, deterministic, easy to unit-test. The resolver below feeds it a
 * snapshot of the viewer's plan + addons + role names + tenant locale +
 * tenant id, and the function returns whether the announcement qualifies.
 */

export interface AnnouncementTargeting {
  plans?: ReadonlyArray<string>;
  addons?: ReadonlyArray<string>;
  roles?: ReadonlyArray<string>;
  locales?: ReadonlyArray<string>;
  tenantIds?: ReadonlyArray<string>;
}

export interface ViewerTarget {
  plan: string;
  addons: ReadonlySet<string>;
  roles: ReadonlyArray<string>;
  locale: string;
  tenantId: string | null;
}

/** Parse the raw JSON column into a strongly-typed targeting object. */
export function parseTargeting(raw: unknown): AnnouncementTargeting {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return {};
  const obj = raw as Record<string, unknown>;
  const result: AnnouncementTargeting = {};
  if (Array.isArray(obj.plans))
    result.plans = obj.plans.filter((x): x is string => typeof x === 'string');
  if (Array.isArray(obj.addons))
    result.addons = obj.addons.filter((x): x is string => typeof x === 'string');
  if (Array.isArray(obj.roles))
    result.roles = obj.roles.filter((x): x is string => typeof x === 'string');
  if (Array.isArray(obj.locales))
    result.locales = obj.locales.filter((x): x is string => typeof x === 'string');
  if (Array.isArray(obj.tenantIds))
    result.tenantIds = obj.tenantIds.filter((x): x is string => typeof x === 'string');
  return result;
}

function axisMatch(
  filter: ReadonlyArray<string> | undefined,
  candidates: ReadonlyArray<string>,
): boolean {
  if (!filter || filter.length === 0) return true;
  return filter.some((f) => candidates.includes(f));
}

export function matchesTargeting(targeting: AnnouncementTargeting, viewer: ViewerTarget): boolean {
  if (!axisMatch(targeting.plans, [viewer.plan])) return false;
  if (!axisMatch(targeting.addons, Array.from(viewer.addons))) return false;
  if (!axisMatch(targeting.roles, viewer.roles)) return false;
  if (!axisMatch(targeting.locales, [viewer.locale])) return false;
  if (!axisMatch(targeting.tenantIds, viewer.tenantId ? [viewer.tenantId] : [])) return false;
  return true;
}
