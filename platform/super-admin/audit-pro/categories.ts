/**
 * Action category presets for the Super Admin audit pro view.
 *
 * Each preset maps a high-level operator concern (Security, Billing, etc.)
 * to a list of audit-action prefixes the audit table writes. The mapping
 * lives here so the audit page can populate the category dropdown and
 * resolve a category back into a Prisma `OR` clause on `action`.
 */

export const AUDIT_CATEGORIES = [
  'security',
  'billing',
  'addon',
  'mutation',
  'login',
  'impersonation',
] as const;

export type AuditCategory = (typeof AUDIT_CATEGORIES)[number];

/**
 * Prefix list per category. Matching is done by `action LIKE prefix%` so
 * future actions under a given namespace are picked up automatically
 * (e.g. `user.session_revoked` → security; `tenant.suspended` → mutation).
 */
export const CATEGORY_PREFIXES: Record<AuditCategory, ReadonlyArray<string>> = {
  security: ['user.password_reset', 'user.session', 'user.sessions', 'gate.', 'system.'],
  billing: ['plan.', 'billing.', 'subscription.', 'manual.plan.'],
  addon: ['addon.', 'tenant_addon.'],
  mutation: ['tenant.', 'membership.', 'role.', 'user.soft_deleted'],
  login: ['login.', 'auth.'],
  impersonation: ['impersonate.', 'view_as.'],
};

export function isAuditCategory(value: string | undefined): value is AuditCategory {
  return value !== undefined && (AUDIT_CATEGORIES as readonly string[]).includes(value);
}

/** Return Prisma OR-clauses for one category. */
export function categoryActionFilter(category: AuditCategory): Array<{
  action: { startsWith: string };
}> {
  return CATEGORY_PREFIXES[category].map((p) => ({ action: { startsWith: p } }));
}
