/**
 * Global feature flags — the on/off layer that sits ON TOP of RBAC.
 *
 * A nav node is visible only when its permission check passes AND its feature
 * is enabled. This module is PURE (no DB import) so it can be pulled into the
 * nav builder without dragging in `tenant-context`. The DB read lives in
 * `load-enabled-features.ts`. See
 * the internal design spec.
 */

/**
 * Whether a nav node should be shown given the enabled set. Nodes that declare
 * no `feature` key are always-on (never hideable). A declared key is shown only
 * when present in the enabled set — an absent key is OFF by default, so new
 * in-code features stay hidden until an operator turns them on.
 */
export function featureEnabled(enabled: Set<string>, feature?: string): boolean {
  if (!feature) return true;
  return enabled.has(feature);
}
