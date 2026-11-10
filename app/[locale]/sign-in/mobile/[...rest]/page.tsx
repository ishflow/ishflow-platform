import { SignIn } from '@clerk/nextjs';
import { defaultLocale } from '@/platform/i18n/config';

interface Props {
  params: Promise<{ locale: string; rest?: string[] }>;
}

/**
 * Catch-all for Clerk's multi-step sub-routes under `/sign-in/mobile`
 * (e.g. `factor-one`, the new-device `factor-two`, `sso-callback`). The entry
 * page mounts `<SignIn routing="path" path="/sign-in/mobile">`, so Clerk drives
 * each step by navigating to `/sign-in/mobile/<step>`. Without this route those
 * sub-paths 404 and the flow dies mid-sign-in (the bug that left the mobile app
 * stuck on "Loading" after the new-device code).
 *
 * Rendering the same `<SignIn>` lets Clerk re-hydrate the step from the URL and
 * continue. The already-signed-in redirect lives only on the entry page; mid
 * flow the user is not yet authenticated, so this page just renders the widget.
 * `/sign-in/mobile/complete` is an explicit sibling route and takes precedence
 * over this catch-all.
 */
export default async function MobileSignInStep({ params }: Props) {
  const { locale } = await params;
  const completeUrl = '/sign-in/mobile/complete';

  return (
    <main className="flex min-h-svh items-center justify-center p-6">
      <SignIn
        routing="path"
        path={locale === defaultLocale ? '/sign-in/mobile' : `/${locale}/sign-in/mobile`}
        signUpUrl={locale === defaultLocale ? '/sign-up/mobile' : `/${locale}/sign-up/mobile`}
        forceRedirectUrl={completeUrl}
        signUpForceRedirectUrl={completeUrl}
      />
    </main>
  );
}
