import { SignIn } from '@clerk/nextjs';
import { auth } from '@clerk/nextjs/server';
import { redirect } from 'next/navigation';
import { defaultLocale } from '@/platform/i18n/config';

interface Props {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ return_url?: string; force_login?: string }>;
}

export default async function MobileSignIn({ params, searchParams }: Props) {
  const { locale } = await params;
  const { return_url, force_login } = await searchParams;
  const completeUrl = `/sign-in/mobile/complete${return_url ? `?return_url=${encodeURIComponent(return_url)}` : ''}`;

  // If a Clerk session is already present, skip the <SignIn /> render — Clerk's
  // already-signed-in auto-redirect drops the `forceRedirectUrl` query string,
  // which strips `return_url` and breaks the mobile callback handoff.
  // When `force_login=1` is set (e.g. after /sign-out/mobile clears cookies and
  // bounces here), skip the auto-redirect so the user can actually see the
  // <SignIn /> form and pick a different account.
  if (force_login !== '1') {
    const { userId } = await auth();
    if (userId) {
      redirect(completeUrl);
    }
  }

  return (
    <main className="flex min-h-svh items-center justify-center p-6">
      {/*
        Path routing mounted at THIS page's URL. Clerk drives its multi-step
        flow (factor-one, new-device `factor-two`, sso-callback) by navigating
        to sub-paths of `path`; the sibling `[...rest]` catch-all renders the
        same <SignIn> so each step resolves and the flow continues, ending at
        `forceRedirectUrl` → /complete → the `ishflow://` deep link.

        `path` MUST be set: without it Clerk falls back to the global
        NEXT_PUBLIC_CLERK_SIGN_IN_URL (/sign-in) for sub-step navigation —
        which has no matching route and 404s mid-flow (broke new-device login).
        `localePrefix: 'as-needed'` → the default locale carries no prefix.
      */}
      <SignIn
        routing="path"
        path={locale === defaultLocale ? '/sign-in/mobile' : `/${locale}/sign-in/mobile`}
        // Point the in-widget "Sign up" link at the mobile sign-up bridge so a
        // brand-new customer stays in the deep-link flow. Without this it falls
        // back to the global /sign-up, which the middleware bounces to
        // /complete (no session yet → dead-ends at "Sign-in failed").
        signUpUrl={locale === defaultLocale ? '/sign-up/mobile' : `/${locale}/sign-up/mobile`}
        forceRedirectUrl={completeUrl}
        signUpForceRedirectUrl={completeUrl}
      />
    </main>
  );
}
