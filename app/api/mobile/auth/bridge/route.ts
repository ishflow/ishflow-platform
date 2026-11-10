import { resolveContext } from '@/platform/auth/current-context';
import { signMobileJWT } from '@/platform/auth/mobile-jwt';
import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

const DEFAULT_RETURN = 'ishflow://auth/callback';

/**
 * Append `key=value` to a URL using the correct separator. If `base` already
 * contains a `?`, use `&`; otherwise use `?`. Without this, callers passing
 * `ishflow://auth/callback?source=ios` would yield a double-`?` URL that
 * iOS's `URLComponents` parses incorrectly (the second `?` becomes literal).
 */
function appendQuery(base: string, key: string, value: string): string {
  const sep = base.includes('?') ? '&' : '?';
  return `${base}${sep}${key}=${encodeURIComponent(value)}`;
}

/**
 * Build a 302 redirect with `Cache-Control: no-store`. The header is
 * defense-in-depth against any intermediary (Vercel edge, corporate proxy,
 * CDN) caching the response by URL signature and serving the same JWT to
 * a different user — `force-dynamic` only governs Next's render decision,
 * not the response cache header.
 */
function noStoreRedirect(location: string): NextResponse {
  const res = NextResponse.redirect(location, { status: 302 });
  res.headers.set('Cache-Control', 'no-store');
  return res;
}

/**
 * Mobile auth bridge — exchanges a live Clerk session for a mobile JWT and
 * 302s the browser to a `ishflow://` deep link the iOS app intercepts via
 * `ASWebAuthenticationSession`.
 *
 * Open-redirect protection: the `return` query param MUST start with
 * `ishflow://`. Anything else returns 400 — never let an attacker bounce
 * a freshly minted token through arbitrary URLs.
 *
 * The 302 (not Next.js's default 307) is deliberate: OAuth-style bounces
 * traditionally use 302 and some clients special-case the status.
 */
export async function GET(req: Request): Promise<Response> {
  const url = new URL(req.url);
  const returnUrl = url.searchParams.get('return') ?? DEFAULT_RETURN;

  if (!returnUrl.startsWith('ishflow://')) {
    return NextResponse.json({ error: 'invalid return url' }, { status: 400 });
  }

  const ctx = await resolveContext();

  // Non-PII diagnostics only — never log email/clerkId (this runs on every
  // mobile sign-in and ships to prod logs). Finding H2.
  console.log('[BRIDGE] resolveContext result', {
    hasCtx: !!ctx,
    hasTenant: !!ctx?.tenant,
    permissionCount: ctx?.permissions ? [...ctx.permissions].length : 0,
  });

  if (!ctx) {
    console.log('[BRIDGE] reject: no context (401)');
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  if (!ctx.tenant) {
    console.log('[BRIDGE] redirect: no_tenant');
    return noStoreRedirect(appendQuery(returnUrl, 'error', 'no_tenant'));
  }

  // JWT `sub` (claims.userId) MUST be the Clerk user id — that is the
  // identifier `resolveBearerContext` looks up via
  // `findUnique({ where: { clerkId: claims.userId } })`. Signing the platform
  // UUID (`ctx.user.id`) here would make every bearer-mode iOS API call 401
  // silently (the lookup would miss, then fall through to the absent Clerk
  // session). See app/api/mobile/auth/bridge/route.test.ts round-trip test.
  const token = await signMobileJWT({
    userId: ctx.user.clerkId,
    tenantId: ctx.tenant.id,
    scopes: [...ctx.permissions],
  });
  console.log('[BRIDGE] redirect: token minted', { tokenLength: token.length });
  return noStoreRedirect(appendQuery(returnUrl, 'token', token));
}
