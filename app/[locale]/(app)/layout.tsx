import './v2-globals.css';

import {
  AnnouncementsBanner,
  AnnouncementsBell,
  AnnouncementsPopup,
} from '@/components/app/announcements/announcements-mount';
import { V2Shell } from '@/components/v2/shell/layout-shell';
import { resolveContext } from '@/platform/auth/current-context';
import { redirect } from '@/platform/i18n/navigation';
import type { Locale } from '@/platform/metadata';
import { headers } from 'next/headers';

export const dynamic = 'force-dynamic';

// Public app paths: the auth-public group (sign-in/up, 2fa, forgot-password,
// invite-accept, mobile-bridge) + the status pages. Marketing (`/`, `/pricing`…)
// is owned by the V1 (marketing) route group and never reaches this (app)
// layout. When the path matches, the layout skips the auth gate + V2Shell wrap
// so the route group's own layout renders the public chrome; the `.v2-app`
// scope is preserved so variant-9 tokens still apply.
//
// Locale prefix is OPTIONAL: with next-intl `localePrefix: 'as-needed'` the
// default locale (ru) is unprefixed, so `x-pathname` arrives as `/sign-in` for
// ru and `/tr/sign-in` for the others. Both must match, otherwise the ru
// sign-in gets treated as protected and bounces to itself.
const PUBLIC_APP_PATH =
  /^(?:\/[^/]+)?\/(sign-in|sign-up|launch|2fa|forgot-password|invite-accept|mobile-bridge|404|500|403|coming-soon|maintenance|suspended|trial-ended|plan-limit)(\/.*)?$/;

function isPublicAppPath(pathname: string): boolean {
  return PUBLIC_APP_PATH.test(pathname);
}

// Super-admin routes mount their own SaShell (rail + panel + main) and need
// V2Shell's customer-facing chrome suppressed to avoid double-rail UI. We
// originally tried a path-based skip here, but `x-pathname` from middleware
// is unreliable in Next.js 16 dev with turbopack (same caveat noted in
// V2Shell's V2PanelSwitcher fallback), so the suppression now lives in
// `SaShell` as a CSS `:has()` rule that hides V2Shell chrome whenever an
// SaShell is rendered as a descendant.

export default async function V2Layout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ locale: Locale }>;
}) {
  const { locale } = await params;
  const h = await headers();
  const currentPath = h.get('x-pathname') ?? '';

  if (isPublicAppPath(currentPath)) {
    return <div className="v2-app">{children}</div>;
  }

  const ctx = await resolveContext();

  if (!ctx) {
    redirect({ href: '/sign-in', locale });
    return null;
  }
  // Tenant-less or membership-less user (fresh Clerk sign-in that hasn't run
  // the workspace onboarding yet) → push them through the onboarding wizard.
  // Skip when the request is already on an /onboarding/* path, otherwise
  // /onboarding/welcome would redirect to itself.
  const isOnboardingPath = /\/onboarding(\/|$)/.test(currentPath);
  if ((!ctx.tenant || !ctx.membership) && !isOnboardingPath) {
    redirect({ href: '/onboarding/welcome', locale });
    return null;
  }
  if (ctx.tenant?.deletedAt) {
    redirect({ href: '/sign-in?reason=tenant_archived', locale });
    return null;
  }
  if (ctx.tenant?.status === 'suspended' && !currentPath.endsWith('/suspended')) {
    redirect({ href: '/suspended', locale });
    return null;
  }

  // NOTE: We tried `if (isSuperAdminPath(currentPath)) return …` here to skip
  // V2Shell on super-admin routes, but `x-pathname` from middleware is
  // unreliable in Next.js 16 dev with turbopack (same caveat noted in
  // V2Shell's V2PanelSwitcher fallback). The double-rail is now suppressed
  // via a CSS `:has()` rule in `v2-globals.css` that hides the V2Shell when
  // an SaShell is present as a sibling — see `.v2-app:has(.sa-shell)`.

  return (
    <div className="v2-app">
      <V2Shell>
        <AnnouncementsBanner />
        <AnnouncementsPopup />
        <AnnouncementsBell />
        {children}
      </V2Shell>
    </div>
  );
}
