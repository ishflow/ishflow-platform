/**
 * Platform admin gate — for global settings outside any single tenant.
 *
 * Bridges to Super Admin Phase 1's `SUPER_ADMIN_CLERK_USER_IDS` env. When that PR lands its full
 * `/super-admin` surface will subsume this helper; for now it satisfies the
 * immediate need for the subscription feature toggle.
 *
 * If the env var is unset (typical local dev), falls back to "owner of any
 * active tenant" so the operator can test the toggle without configuring an
 * allow-list first.
 */
import type { AppContext } from './current-context';

const ENV_KEY = 'SUPER_ADMIN_CLERK_USER_IDS';

function allowList(): string[] {
  return (process.env[ENV_KEY] ?? '')
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);
}

export function isPlatformAdmin(ctx: Pick<AppContext, 'user' | 'membership'>): boolean {
  const list = allowList();
  if (list.length > 0) {
    return list.includes(ctx.user.clerkId);
  }
  // Fail-closed in production: with no explicit allow-list, NEVER fall back to
  // "owner of any tenant" — that would let every tenant owner reach the
  // operator console (and impersonate tenants). The owner fallback exists only
  // to ease local/dev testing before an allow-list is configured.
  if (process.env.NODE_ENV === 'production') {
    return false;
  }
  const roles =
    (ctx.membership as unknown as { roles?: Array<{ name: string }> } | null)?.roles ?? [];
  return roles.some((r) => r.name === 'owner');
}
