import { V2SignInForm } from '@/components/v2/marketing/auth/sign-in-form';

/**
 * Catch-all for Clerk's path-routed sign-in sub-steps
 * (`/sign-in/factor-two`, `/sign-in/factor-one`, `/sign-in/sso-callback`,
 * `/sign-in/reset-password`, …). Without this route those URLs 404, so the
 * `<SignIn>` flow renders the step but can never complete its navigation —
 * 2FA verification hangs on a dead route. Renders the same `<SignIn>` as the
 * index page so Clerk re-hydrates the step from the URL. Mirrors the mobile
 * flow's `sign-in/mobile/[...rest]` catch-all.
 */
export default async function V2SignInCatchAllPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  return <V2SignInForm locale={locale} />;
}
