import { defaultLocale } from '@/platform/i18n/config';
import { SignIn, SignUp } from '@clerk/nextjs';

interface Props {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ __clerk_status?: string }>;
}

// Ticket-accept bridge. The invitation email links here with
// `__clerk_ticket` + `__clerk_status` query params; Clerk auto-detects the
// ticket from the URL. New invitees get <SignUp> (password / Google / Apple,
// whichever are enabled in the Clerk dashboard); existing accounts joining an
// additional company come in via `__clerk_status=sign_in` → <SignIn>. Both
// force-redirect to `/invite/profile` after the org invite is accepted.
export default async function InviteContinue({ params, searchParams }: Props) {
  const { locale } = await params;
  const { __clerk_status } = await searchParams;
  // Default locale (`ru`) carries no prefix under `localePrefix: 'as-needed'`.
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
