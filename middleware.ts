import { isPublicRoute } from '@/platform/auth/public-routes';
import {
  SUPER_IMPERSONATE_COOKIE,
  SUPER_IMPERSONATE_HEADER,
  verifyCookie as verifySuperImpersonateCookie,
} from '@/platform/auth/super-impersonate';
import { routing } from '@/platform/i18n/routing';
import { getMaintenanceState, getReadonlyEnabled } from '@/platform/super-admin/system/maintenance';
import { clerkMiddleware } from '@clerk/nextjs/server';
import createIntlMiddleware from 'next-intl/middleware';
import { NextResponse } from 'next/server';

const intlMiddleware = createIntlMiddleware(routing);

const SAFE_METHODS = new Set(['GET', 'HEAD', 'OPTIONS']);
const IMPERSONATE_END_PATH = /^\/super-admin\/tenants\/[^/]+\/impersonate\/end\/?$/;

// The super-admin console PAGES live in the localized V2 tree
// (`app/[locale]/(app)/super-admin/**`). A handful of locale-free ENDPOINT
// handlers (`route.ts`) still live in the legacy `app/super-admin/**` tree and
// are linked directly (locale-free) from the V2 pages — impersonate start/end,
// the audit/tenant CSV exports, and the newsletter export. Those MUST stay
// locale-free (skip i18n). Everything else under `/super-admin` is a page and
// flows through i18n so the default-locale (ru) operator lands on the V2 tree
// instead of the orphaned legacy pages. Matches == "keep locale-free, skip i18n".
const SUPER_ADMIN_LOCALE_FREE_ENDPOINT =
  /^\/super-admin\/(?:audit\/export|marketing\/newsletter\/export|tenants\/[^/]+\/(?:impersonate\/(?:start|end)|export))\/?$/;

// True for `/super-admin` paths that must bypass i18n (the locale-free legacy
// endpoints above). Super-admin PAGES return false so they route to the V2 tree.
function isSuperAdminLocaleFreeEndpoint(pathname: string): boolean {
  return SUPER_ADMIN_LOCALE_FREE_ENDPOINT.test(pathname);
}

// Locale-prefixed or bare `/maintenance`. When maintenance mode is enabled in
// `PlatformSetting`, tenant-app routes redirect here. The page itself,
// `/super-admin/**`, `/api/**`, and auth flows are always allowed through.
const MAINTENANCE_PATH = /^(?:\/(?:ru|en|tr|uz|ky|de|fr|zh))?\/maintenance\/?$/;

const TAB_IFRAME_HEADER = 'x-tab-iframe';
const MOBILE_RETURN_URL_COOKIE = 'mobile_return_url';
const MOBILE_RETURN_URL_TTL_SECONDS = 600;
// Locale-prefixed or bare `/sign-in/mobile` (entry only — `/complete` reads the cookie).
const MOBILE_SIGNIN_ENTRY = /^(?:\/(?:ru|en|tr|uz|ky|de|fr|zh))?\/sign-in\/mobile\/?$/;
// Locale-prefixed or bare `/sign-up/mobile` — the brand-new-customer bridge.
// New users cross here from the sign-in widget's `signUpUrl`; the entry captures
// `return_url` into the cookie exactly like sign-in, and account creation reuses
// `/sign-in/mobile/complete` to mint the JWT + fire the deep link.
const MOBILE_SIGNUP_ENTRY = /^(?:\/(?:ru|en|tr|uz|ky|de|fr|zh))?\/sign-up\/mobile\/?$/;
// Belt-and-suspenders for the Clerk `<OrganizationSwitcher />` Manage modal:
// we hide the trigger via `appearance.elements`, but if a future Clerk
// version renames the selector or someone deep-links, route any Clerk
// org-profile path to our consolidated /settings/organization tab.
const CLERK_ORG_PROFILE_PATTERN =
  /^(?:\/(?:ru|en|tr|uz|ky|de|fr|zh))?\/organization-profile(?:\/.*)?$/;

// Local-dev auth bypass — when DEV_AUTH_BYPASS=1 AND not production, skip
// every Clerk check so localhost iteration doesn't require logging in.
// Triple-guarded: NODE_ENV gate + explicit env opt-in. Never active in prod
// (Vercel hardcodes NODE_ENV=production for `next build`/`next start`, and
// the env var is only in .env.local — never in .env.production*).
function isDevAuthBypassActive(): boolean {
  if (process.env.NODE_ENV === 'production') return false;
  return process.env.DEV_AUTH_BYPASS === '1';
}

export default clerkMiddleware(async (auth, req) => {
  if (isDevAuthBypassActive()) {
    // Still run the i18n + tab-iframe header logic so the rest of the app
    // sees the URL it expects. Just skip every Clerk auth.protect() call.
    const path = req.nextUrl.pathname;
    if (path.startsWith('/api/') || isSuperAdminLocaleFreeEndpoint(path)) {
      return;
    }
    // Super-admin PAGES fall through to i18n so the default-locale (ru) operator
    // resolves to the V2 tree (`/{locale}/super-admin/**`) rather than the
    // orphaned legacy pages at the literal `/super-admin/**` path.
    return intlMiddleware(req);
  }

  // Super-admin impersonation: HMAC-signed cookie short-lived (15min). When
  // present and valid, surface the impersonated tenantId via a request header
  // so server components / context resolvers can swap the active tenant. Mutations
  // are blocked except for the impersonate-end route. Invalid/expired cookies
  // are scrubbed so a fresh round trip clears stale state.
  const superImpersonateRaw = req.cookies.get(SUPER_IMPERSONATE_COOKIE)?.value;
  let superImpersonatePayload: Awaited<ReturnType<typeof verifySuperImpersonateCookie>> = null;
  let superImpersonateCookieInvalid = false;
  if (superImpersonateRaw) {
    try {
      superImpersonatePayload = await verifySuperImpersonateCookie(superImpersonateRaw);
    } catch {
      // verifyCookie itself catches; if secret is missing it throws. Treat as
      // invalid so the cookie is cleared rather than leaving the request stuck.
      superImpersonatePayload = null;
    }
    if (!superImpersonatePayload) {
      superImpersonateCookieInvalid = true;
    }
  }

  if (superImpersonatePayload) {
    const path = req.nextUrl.pathname;
    if (!SAFE_METHODS.has(req.method) && !IMPERSONATE_END_PATH.test(path)) {
      return NextResponse.json({ error: 'impersonation_readonly' }, { status: 403 });
    }
    req.headers.set(SUPER_IMPERSONATE_HEADER, superImpersonatePayload.tenantId);
  }

  if (CLERK_ORG_PROFILE_PATTERN.test(req.nextUrl.pathname)) {
    const url = req.nextUrl.clone();
    url.pathname = '/settings/organization';
    url.search = '';
    return NextResponse.redirect(url);
  }

  // Maintenance mode — redirect tenant-app traffic to `/maintenance` when the
  // global flag is enabled. The redirect MUST exclude:
  // - the maintenance page itself (loop prevention)
  // - `/super-admin/**` (operator console must remain reachable to disable)
  // - `/api/**` (return JSON 503 instead — the consumers parse it)
  // - auth flows (`/sign-in`, `/sign-up`, `/sign-out`) so users can recover
  // - Clerk's iframe-mounted dev session endpoints under `/clerk/`
  // The check is gated on a 30s in-process cache (`getMaintenanceState`),
  // so the per-request cost is a Map lookup on the hot path.
  {
    const path = req.nextUrl.pathname;
    const isStatic =
      path.startsWith('/_next') ||
      path.startsWith('/favicon') ||
      path.startsWith('/clerk') ||
      MAINTENANCE_PATH.test(path);
    const isApi = path.startsWith('/api/');
    const isSuperAdmin = path.startsWith('/super-admin');
    const isAuth =
      path === '/sign-in' ||
      path === '/sign-up' ||
      path === '/sign-out' ||
      path.startsWith('/sign-in/') ||
      path.startsWith('/sign-up/') ||
      path.startsWith('/sign-out/') ||
      /^\/(?:ru|en|tr|uz|ky|de|fr|zh)\/sign-(?:in|up|out)(?:\/|$)/.test(path);
    if (!isStatic && !isSuperAdmin && !isAuth) {
      const maintenance = await getMaintenanceState();
      if (maintenance.enabled) {
        if (isApi) {
          return NextResponse.json(
            {
              error: 'maintenance_mode',
              until: maintenance.until,
              message: maintenance.message ?? null,
            },
            { status: 503, headers: { 'Retry-After': '120' } },
          );
        }
        const url = req.nextUrl.clone();
        url.pathname = '/maintenance';
        url.search = '';
        return NextResponse.redirect(url);
      }
    }
  }

  // Read-only mode — reject tenant *writes* with a JSON 503 while reads keep
  // working. Unlike maintenance mode (which freezes ALL traffic), this only
  // blocks mutating methods (POST/PUT/PATCH/DELETE), which also covers Server
  // Action POSTs (they short-circuit here before the action body runs). Same
  // 30s in-process cache, so the per-request cost on the read hot path is a
  // single `SAFE_METHODS` lookup that bails before touching the flag. Excludes:
  // - safe methods (GET/HEAD/OPTIONS) — reads always allowed
  // - `/super-admin/**` — operator must stay able to flip the flag back off
  // - auth flows + `/clerk` — users can still sign in/out to recover
  // - `/api/webhooks/**` — external events (Stripe/Clerk) must not be dropped
  // - `/api/cron/**` — secret-authed platform jobs, not tenant writes
  if (!SAFE_METHODS.has(req.method)) {
    const path = req.nextUrl.pathname;
    const exempt =
      path.startsWith('/super-admin') ||
      path.startsWith('/clerk') ||
      path.startsWith('/api/webhooks/') ||
      path.startsWith('/api/cron/') ||
      path === '/sign-in' ||
      path === '/sign-up' ||
      path === '/sign-out' ||
      path.startsWith('/sign-in/') ||
      path.startsWith('/sign-up/') ||
      path.startsWith('/sign-out/') ||
      /^\/(?:ru|en|tr|uz|ky|de|fr|zh)\/sign-(?:in|up|out)(?:\/|$)/.test(path);
    if (!exempt && (await getReadonlyEnabled())) {
      return NextResponse.json(
        { error: 'readonly_mode' },
        { status: 503, headers: { 'Retry-After': '120' } },
      );
    }
  }

  // Skip i18n for API, webhook routes, and the locale-free /super-admin ENDPOINTS
  // (impersonate, exports). Super-admin PAGES are intentionally NOT skipped — they
  // fall through to the i18n middleware below so the default-locale (ru) operator
  // lands on the V2 tree (`/{locale}/super-admin/**`) instead of the orphaned
  // legacy pages. The legacy page files become unreachable (dead code) by design.
  if (
    req.nextUrl.pathname.startsWith('/api/') ||
    isSuperAdminLocaleFreeEndpoint(req.nextUrl.pathname)
  ) {
    if (!isPublicRoute(req)) {
      await auth.protect();
    }
    if (superImpersonatePayload) {
      // Forward the impersonation header to API/super-admin handlers via the
      // middleware request-header override convention so resolveContext()
      // can read it from next/headers.
      const apiResponse = NextResponse.next({ request: { headers: req.headers } });
      apiResponse.headers.set(SUPER_IMPERSONATE_HEADER, superImpersonatePayload.tenantId);
      apiResponse.headers.set('x-middleware-override-headers', SUPER_IMPERSONATE_HEADER);
      apiResponse.headers.set(
        `x-middleware-request-${SUPER_IMPERSONATE_HEADER}`,
        superImpersonatePayload.tenantId,
      );
      return apiResponse;
    }
    if (superImpersonateCookieInvalid) {
      const apiResponse = NextResponse.next();
      apiResponse.cookies.delete(SUPER_IMPERSONATE_COOKIE);
      return apiResponse;
    }
    return;
  }

  if (!isPublicRoute(req)) {
    await auth.protect();
  }

  // Mobile sign-in handoff: `return_url` arrives as a query string on the entry
  // page, but Clerk's post-signin redirect strips the query off `forceRedirectUrl`
  // (and Clerk's OAuth callback handler ignores the prop entirely, falling back
  // to the legacy `NEXT_PUBLIC_CLERK_AFTER_SIGN_IN_URL`). Persist it as a
  // short-lived cookie so `/sign-in/mobile/complete` can recover it.
  const mobileReturnUrl =
    req.method === 'GET' &&
    (MOBILE_SIGNIN_ENTRY.test(req.nextUrl.pathname) ||
      MOBILE_SIGNUP_ENTRY.test(req.nextUrl.pathname))
      ? req.nextUrl.searchParams.get('return_url')
      : null;

  // If we're already in a mobile auth flow (cookie present) but Clerk redirected
  // us elsewhere — typically /dashboard via the legacy AFTER_SIGN_IN_URL env —
  // bounce to /complete so the JWT mints and the ishflow:// deep link fires.
  // Skip the bounce on the entry/complete pages themselves, and on API routes
  // (mobile clients still hit /api/mobile/* while the cookie may linger).
  const inMobileFlow =
    req.method === 'GET' &&
    req.cookies.get(MOBILE_RETURN_URL_COOKIE)?.value &&
    !MOBILE_SIGNIN_ENTRY.test(req.nextUrl.pathname) &&
    !MOBILE_SIGNUP_ENTRY.test(req.nextUrl.pathname) &&
    // Exclude the ENTIRE /sign-in/mobile AND /sign-up/mobile subtrees — the
    // entries, /complete, and Clerk's path-routed multi-step sub-pages
    // (/factor-one, /factor-two, /sso-callback for sign-in;
    // /verify-email-address, /continue for sign-up) served by the [...rest]
    // catch-alls. Bouncing those to /complete mid-flow would abort the flow
    // before the session exists and the JWT mints.
    !req.nextUrl.pathname.includes('/sign-in/mobile') &&
    !req.nextUrl.pathname.includes('/sign-up/mobile') &&
    !req.nextUrl.pathname.includes('/sign-out/mobile') &&
    !req.nextUrl.pathname.startsWith('/api/');
  if (inMobileFlow) {
    return NextResponse.redirect(new URL('/sign-in/mobile/complete', req.nextUrl));
  }

  // iframe mode is carried on the URL query flag for direct navigations.
  // Server Action POSTs and RSC revalidation fetches originate from the
  // iframe but lose the query string — so fall back to the Referer header,
  // whose URL still carries the flag. `Next-Url` (RSC prefetch) does the same.
  const queryFlag = req.nextUrl.searchParams.get('__tab_iframe') === '1';
  const refererHasFlag = (() => {
    const ref = req.headers.get('referer');
    if (!ref) return false;
    try {
      return new URL(ref).searchParams.get('__tab_iframe') === '1';
    } catch {
      return false;
    }
  })();
  const nextUrlHasFlag = (() => {
    const nu = req.headers.get('next-url');
    if (!nu) return false;
    // next-url is a relative path like "/en/catalogs/x/new?__tab_iframe=1"
    const idx = nu.indexOf('?');
    if (idx === -1) return false;
    const params = new URLSearchParams(nu.slice(idx + 1));
    return params.get('__tab_iframe') === '1';
  })();
  const isIframe = queryFlag || refererHasFlag || nextUrlHasFlag;
  // Only tag GET requests — Server Action POSTs go through the same URL but
  // we don't want to inject middleware-override headers into the action
  // response (React can't parse an RSC action payload that also carries
  // those middleware hints, and throws "An unexpected response was received
  // from the server.").
  const shouldTagIframe = isIframe && req.method === 'GET';

  // Surface the iframe flag to server components via the Next.js
  // `x-middleware-override-headers` convention so the platform layout
  // can branch on it without relying on searchParams (layouts don't
  // receive searchParams in Next 15/16).
  if (shouldTagIframe) {
    req.headers.set(TAB_IFRAME_HEADER, '1');
  }

  const response = intlMiddleware(req);
  if (shouldTagIframe && response) {
    response.headers.set(TAB_IFRAME_HEADER, '1');
    response.headers.set('x-middleware-override-headers', TAB_IFRAME_HEADER);
    response.headers.set(`x-middleware-request-${TAB_IFRAME_HEADER}`, '1');
  }
  // Suspended-tenant redirect support: surface the request path so the
  // platform layout can detect when the user is already on /suspended and
  // skip the redirect (otherwise a suspended tenant would infinite-loop
  // through the layout's status guard).
  if (response && req.method === 'GET') {
    const path = req.nextUrl.pathname;
    response.headers.set('x-pathname', path);
    const existingOverride = response.headers.get('x-middleware-override-headers');
    response.headers.set(
      'x-middleware-override-headers',
      existingOverride ? `${existingOverride},x-pathname` : 'x-pathname',
    );
    response.headers.set('x-middleware-request-x-pathname', path);
  }
  if (superImpersonatePayload && response) {
    // Forward the impersonation header to server components via the Next.js
    // middleware request-header override convention (same channel used for
    // the iframe tag above).
    response.headers.set(SUPER_IMPERSONATE_HEADER, superImpersonatePayload.tenantId);
    const existingOverride = response.headers.get('x-middleware-override-headers');
    response.headers.set(
      'x-middleware-override-headers',
      existingOverride
        ? `${existingOverride},${SUPER_IMPERSONATE_HEADER}`
        : SUPER_IMPERSONATE_HEADER,
    );
    response.headers.set(
      `x-middleware-request-${SUPER_IMPERSONATE_HEADER}`,
      superImpersonatePayload.tenantId,
    );
  }
  if (superImpersonateCookieInvalid && response) {
    response.cookies.delete(SUPER_IMPERSONATE_COOKIE);
  }
  if (mobileReturnUrl && response) {
    response.cookies.set(MOBILE_RETURN_URL_COOKIE, mobileReturnUrl, {
      httpOnly: true,
      sameSite: 'lax',
      secure: true,
      path: '/',
      maxAge: MOBILE_RETURN_URL_TTL_SECONDS,
    });
  }
  return response;
});

export const config = {
  matcher: [
    '/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest|txt|xml)).*)',
    '/(api|trpc)(.*)',
  ],
  // Node runtime — required because the maintenance-mode check reaches into
  // `PlatformSetting` via Prisma. Node middleware is supported in Next.js
  // 15+ (stable in 16). Without this, the Edge runtime cannot import
  // `@/platform/db/tenant-context` (Prisma is Node-only).
  runtime: 'nodejs',
};
