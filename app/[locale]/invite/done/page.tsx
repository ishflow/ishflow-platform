import { InviteHandoff } from '@/components/v2/marketing/auth/invite-handoff';
import { resolveContext } from '@/platform/auth/current-context';
import { headers } from 'next/headers';
import { redirect } from 'next/navigation';

function isMobileUA(ua: string): boolean {
  return /Android|iPhone|iPad|iPod/i.test(ua);
}

// Platform-adaptive landing. Desktop browsers go straight to the role-scoped
// web dashboard. Mobile browsers see the "Open in app" interstitial so the
// worker can hand off to the native app (or download / continue in browser).
export default async function InviteDone() {
  const ua = (await headers()).get('user-agent') ?? '';
  // Force the just-accepted Clerk org membership to sync into the DB BEFORE the
  // hand-off. /dashboard lives in the (app) group, whose layout bounces any
  // tenant-less user into OWNER onboarding (welcome → "create workspace") — the
  // exact bug this flow fixes. resolveContext() triggers the on-demand
  // Clerk→DB membership sync, so by the time /dashboard's layout runs the
  // invitee already has a tenant + membership and is not bounced.
  await resolveContext();
  if (!isMobileUA(ua)) {
    redirect('/dashboard');
  }
  return <InviteHandoff />;
}
