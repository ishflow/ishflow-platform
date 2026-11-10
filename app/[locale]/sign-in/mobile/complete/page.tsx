import { auth, clerkClient } from '@clerk/nextjs/server';
import { cookies } from 'next/headers';

interface Props {
  searchParams: Promise<{ return_url?: string }>;
}

const MOBILE_RETURN_URL_COOKIE = 'mobile_return_url';

export default async function MobileSignInComplete({ searchParams }: Props) {
  const { return_url: queryReturnUrl } = await searchParams;
  const cookieStore = await cookies();
  const cookieReturnUrl = cookieStore.get(MOBILE_RETURN_URL_COOKIE)?.value;
  const returnUrl = queryReturnUrl ?? cookieReturnUrl;

  const { userId, orgId, getToken } = await auth();

  // After force_login=1 the previous Clerk session and its `lastActiveOrganizationId`
  // are wiped. If the user has memberships but no active org, pin the oldest one so
  // the minted JWT carries `org_id` — without this the Android client lands in a
  // permission-less state (empty fabActions → FAB hidden, empty tabs → tab bar gaps).
  if (userId && !orgId) {
    try {
      const clerk = await clerkClient();
      const list = await clerk.users.getOrganizationMembershipList({ userId });
      const oldest = [...list.data].sort(
        (a, b) =>
          new Date(a.createdAt ?? 0).getTime() - new Date(b.createdAt ?? 0).getTime(),
      )[0];
      if (oldest?.organization?.id) {
        await clerk.users.updateUser(userId, {
          lastActiveOrganizationId: oldest.organization.id,
        } as Parameters<typeof clerk.users.updateUser>[1]);
      }
    } catch (err) {
      console.error('[mobile.sign-in.complete] auto-pin org failed', err);
    }
  }

  // Try the explicit `mobile` JWT template first — it carries the extra
  // claims (orgSlug, orgRole, email) that mobile features may rely on. If the
  // template isn't configured in the Clerk dashboard for this instance, fall
  // back to the default session token: the server (`platform/auth/current-
  // context.ts`) verifies any Clerk-signed JWT via JWKS and only reads
  // `sub` + `org_id`, both of which the default token already carries.
  let token = await getToken({ template: 'mobile' }).catch(() => null);
  if (!token) {
    token = await getToken();
  }

  if (!token) {
    return <p>Sign-in failed. Please retry.</p>;
  }

  if (!returnUrl) {
    return <p>Missing return_url. Re-launch sign-in from the mobile app.</p>;
  }

  // Validate scheme is ishflow:// for safety
  let target: URL;
  try {
    target = new URL(returnUrl);
  } catch {
    return <p>Invalid return_url.</p>;
  }
  const allowed = ['ishflow:'];
  if (!allowed.includes(target.protocol)) {
    return <p>Disallowed return_url scheme.</p>;
  }

  // The mobile_return_url cookie expires automatically (10min TTL set by
  // middleware). We cannot mutate cookies from a Server Component in Next 16
  // (must use Server Action or Route Handler) — leaving it to TTL is fine
  // since the cookie is HttpOnly + scoped to the sign-in flow.
  target.searchParams.set('token', token);

  // Custom-scheme redirect (ishflow://) — Next.js 16's server `redirect()` rejects
  // non-http(s) URLs and throws 500. Hand the redirect off to the browser via a
  // meta-refresh + JS fallback so Chrome's Custom Tab can resolve the deep link.
  const targetUrl = target.toString();
  return (
    <html lang="en">
      <head>
        <meta httpEquiv="refresh" content={`0;url=${targetUrl}`} />
        <title>Signing you in…</title>
      </head>
      <body>
        <p>Returning to the app…</p>
        <script
          // biome-ignore lint/security/noDangerouslySetInnerHtml: trusted server-rendered URL
          dangerouslySetInnerHTML={{
            __html: `window.location.replace(${JSON.stringify(targetUrl)})`,
          }}
        />
      </body>
    </html>
  );
}
