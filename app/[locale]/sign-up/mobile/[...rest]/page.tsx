import { SignUp } from '@clerk/nextjs';
import { defaultLocale } from '@/platform/i18n/config';

interface Props {
  params: Promise<{ locale: string; rest?: string[] }>;
}

/**
 * Catch-all for Clerk's path-routed sign-up sub-routes under `/sign-up/mobile`
 * (e.g. `verify-email-address`, `sso-callback`, `continue`). The entry page
 * mounts `<SignUp routing="path" path="/sign-up/mobile">`, so Clerk drives each
 * step by navigating to `/sign-up/mobile/<step>`. Without this route those
 * sub-paths 404 and account creation dies at the email-verification step.
 *
 * Rendering the same `<SignUp>` lets Clerk re-hydrate the step from the URL and
 * continue. The already-signed-in redirect lives only on the entry page; mid
 * flow the user is not yet authenticated, so this page just renders the widget.
 * `/sign-in/mobile/complete` is an explicit route and takes precedence over the
 * sign-up flow's `forceRedirectUrl` target.
 */
export default async function MobileSignUpStep({ params }: Props) {
  const { locale } = await params;
  const completeUrl = '/sign-in/mobile/complete';

  return (
    <main className="flex min-h-svh items-center justify-center p-6">
      <SignUp
        routing="path"
        path={locale === defaultLocale ? '/sign-up/mobile' : `/${locale}/sign-up/mobile`}
        signInUrl={locale === defaultLocale ? '/sign-in/mobile' : `/${locale}/sign-in/mobile`}
        forceRedirectUrl={completeUrl}
        signInForceRedirectUrl={completeUrl}
      />
    </main>
  );
}
