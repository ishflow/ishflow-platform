import { V2SignUpForm } from '@/components/v2/marketing/auth/sign-up-form';

/**
 * Catch-all for Clerk's path-routed sign-up sub-steps
 * (`/sign-up/verify-email-address`, `/sign-up/sso-callback`,
 * `/sign-up/continue`, …). Without this route those URLs 404, so email
 * verification / OAuth completion hangs on a dead route. Renders the same
 * `<SignUp>` as the index page so Clerk re-hydrates the step from the URL.
 */
export default async function V2SignUpCatchAllPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  return <V2SignUpForm locale={locale} />;
}
