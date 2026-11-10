import { SignUp } from '@clerk/nextjs';
import { auth } from '@clerk/nextjs/server';
import { redirect } from 'next/navigation';
import { defaultLocale } from '@/platform/i18n/config';

interface Props {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ return_url?: string }>;
}

export default async function MobileSignUp({ params, searchParams }: Props) {
  const { locale } = await params;
  const { return_url } = await searchParams;
  const completeUrl = `/sign-in/mobile/complete${return_url ? `?return_url=${encodeURIComponent(return_url)}` : ''}`;

  // If a Clerk session already exists (e.g. the user crossed here from the
  // sign-in bridge but is in fact already authenticated), skip the <SignUp>
  // render and go straight to /complete so the JWT mints and the deep link
  // fires. Mirrors the guard on the sign-in bridge — Clerk's already-signed-in
  // auto-redirect drops the query string, which would strip return_url.
  const { userId } = await auth();
  if (userId) {
    redirect(completeUrl);
  }

  return (
    <main className="flex min-h-svh items-center justify-center p-6">
      {/*
        Mirror of /sign-in/mobile for brand-new customers who have no account.
        Clerk's <SignIn> "Sign up" link points here (via `signUpUrl`) instead of
        the global web /sign-up route, so account creation stays inside the
        mobile bridge and ends at /sign-in/mobile/complete → `ishflow://` deep
        link (the same complete page mints the JWT regardless of sign-in vs
        sign-up — it only needs a Clerk session). `return_url` is also carried
        by the `mobile_return_url` cookie set on the /sign-in/mobile entry.

        `path` MUST be set so Clerk drives its sub-steps (verify-email-address,
        sso-callback, continue) under /sign-up/mobile, resolved by the sibling
        [...rest] catch-all. Without it Clerk falls back to the global
        NEXT_PUBLIC_CLERK_SIGN_UP_URL (/sign-up) and 404s mid-verification.
        `signInUrl` points the "Already have an account?" link back at the
        mobile sign-in bridge instead of the global /sign-in.
      */}
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
