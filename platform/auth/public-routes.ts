import { createRouteMatcher } from '@clerk/nextjs/server';

/**
 * Routes that bypass Clerk's `auth.protect()` in `middleware.ts`. Extracted from
 * the middleware so the matcher can be unit-tested in isolation (the inline
 * middleware import chain pulls in Prisma + next-intl and is awkward to load in
 * vitest). `middleware.ts` imports `isPublicRoute` from here verbatim.
 *
 * Locale awareness: `localePrefix: 'as-needed'` means the default locale (ru)
 * is served WITHOUT a prefix, while every other locale is prefixed
 * (`/en/...`, `/tr/...`). next-intl's locale-detection then REDIRECTS a bare
 * path to its prefixed form whenever the device's `NEXT_LOCALE` cookie /
 * Accept-Language is non-default. So every public path that a non-ru device can
 * land on MUST be listed in BOTH its bare and `/(locale)/` prefixed form — a
 * gap in the prefixed form silently breaks all non-ru locales while ru works.
 */
export const PUBLIC_ROUTE_PATTERNS = [
  '/',
  '/(ru|en|tr|uz|ky|de|fr|zh)',
  '/(ru|en|tr|uz|ky|de|fr|zh)/sign-in(.*)',
  '/(ru|en|tr|uz|ky|de|fr|zh)/sign-up(.*)',
  // Mobile sign-OUT bridge (Android/iOS Custom Tab starts here). Like sign-in /
  // sign-up above, the prefixed form MUST be public: a non-ru device hitting
  // bare `/sign-out/mobile` gets 307-redirected by next-intl to
  // `/en/sign-out/mobile`, and without this entry `auth.protect()` derails the
  // Custom Tab to the global web sign-in — breaking the deep-link handoff for
  // every non-default locale (ru worked only because it stays bare).
  '/(ru|en|tr|uz|ky|de|fr|zh)/sign-out(.*)',
  '/(ru|en|tr|uz|ky|de|fr|zh)/pricing',
  '/(ru|en|tr|uz|ky|de|fr|zh)/features(.*)',
  '/(ru|en|tr|uz|ky|de|fr|zh)/integrations(.*)',
  '/(ru|en|tr|uz|ky|de|fr|zh)/blog(.*)',
  '/(ru|en|tr|uz|ky|de|fr|zh)/about',
  '/(ru|en|tr|uz|ky|de|fr|zh)/contact',
  '/(ru|en|tr|uz|ky|de|fr|zh)/privacy',
  '/(ru|en|tr|uz|ky|de|fr|zh)/terms',
  '/(ru|en|tr|uz|ky|de|fr|zh)/security',
  '/(ru|en|tr|uz|ky|de|fr|zh)/changelog',
  '/(ru|en|tr|uz|ky|de|fr|zh)/roadmap',
  // Temporary landing-redesign previews (V2 at the root, V3+ nested) — remove
  // with app/[locale]/design-preview.
  '/(ru|en|tr|uz|ky|de|fr|zh)/design-preview(.*)',
  '/design-preview(.*)',
  '/features(.*)',
  '/integrations(.*)',
  '/blog(.*)',
  '/about',
  '/contact',
  '/privacy',
  '/terms',
  '/security',
  '/changelog',
  '/roadmap',
  '/sitemap.xml',
  '/robots.txt',
  '/sign-in(.*)',
  '/sign-up(.*)',
  '/sign-out/mobile',
  // Invite-onboarding bridge (`/invite/continue` → `/invite/profile` →
  // `/invite/done`). Public: the ticket-accept page must render Clerk's widget
  // for signed-out invitees; the profile/done steps run post-auth but stay
  // public here so Clerk's own redirect — not `auth.protect()` — drives the
  // flow. No `mobile_return_url` cookie is set on this flow, so the mobile
  // bounce below never fires.
  '/invite(.*)',
  '/(ru|en|tr|uz|ky|de|fr|zh)/invite(.*)',
  // App subtree: auth is owned by `app/[locale]/(app)/layout.tsx`, which renders
  // public app paths (auth-public, status) directly and redirects unauthenticated
  // users on protected paths to /sign-in. Letting the whole app surface through
  // here — instead of Clerk's `auth.protect()` — avoids Clerk rewriting public
  // app pages to 404 for signed-out users (the prod-only bug dev-bypass hid). One
  // regex covers every (app) segment (protected routes + auth-public extras +
  // status pages) with the optional `as-needed` locale prefix. `/super-admin` is
  // intentionally excluded so it stays behind `auth.protect()`; `/sign-in` and
  // `/sign-up` are already covered above.
  /^\/(?:(?:ru|en|tr|uz|ky|de|fr|zh)\/)?(?:dashboard|launch|catalogs|documents|purchases|registers|reports|settings|admin|addons|onboarding|saved-views|search|dev|2fa|forgot-password|invite-accept|mobile-bridge|404|500|403|coming-soon|maintenance|plan-limit|suspended|trial-ended)(?:\/.*)?$/,
  '/pricing',
  '/api/webhooks/(.*)',
  '/api/mobile/(.*)',
  '/api/v1/(.*)',
  '/api/mcp(.*)',
  '/api/marketing/(.*)',
  '/api/og(.*)',
];

export const isPublicRoute = createRouteMatcher(PUBLIC_ROUTE_PATTERNS);
