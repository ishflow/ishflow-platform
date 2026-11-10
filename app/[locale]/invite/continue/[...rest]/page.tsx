import { defaultLocale } from '@/platform/i18n/config';
import { SignIn, SignUp } from '@clerk/nextjs';

interface Props {
  params: Promise<{ locale: string; rest?: string[] }>;
  searchParams: Promise<{ __clerk_status?: string }>;
}

/**
 * Catch-all for Clerk's multi-step sub-routes under `/invite/continue`
 * (e.g. `verify-email-address`, `sso-callback`, `continue`). The entry page
 * mounts `<SignUp>`/`<SignIn>` with `routing="path"`, so Clerk drives each
 * step by navigating to `/invite/continue/<step>`. Without this route those
 * sub-paths 404 and the ticket-accept flow dies mid-sign-up.
 *
 * Rendering the same widget lets Clerk re-hydrate the step from the URL and
 * continue, ending at `forceRedirectUrl` → `/invite/profile`. Mirrors the
 * `/sign-in/mobile/[...rest]` catch-all.
 */
export default async function InviteContinueStep({ params, searchParams }: Props) {
  const { locale } = await params;
  const { __clerk_status } = await searchParams;
  const base = locale === defaultLocale ? '/invite/continue' : `/${locale}/invite/continue`;
  const profile = '/invite/profile';
  const isSignIn = __clerk_status === 'sign_in';

  return (
    <main className="flex min-h-svh items-center justify-center p-6">
      {isSignIn ? (
        <SignIn
          routing="path"
          path={base}
          forceRedirectUrl={profile}
          signUpForceRedirectUrl={profile}
        />
      ) : (
        <SignUp
          routing="path"
          path={base}
          forceRedirectUrl={profile}
          signInForceRedirectUrl={profile}
        />
      )}
    </main>
  );
}
