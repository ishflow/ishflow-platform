import { listApiTokensAction } from '@/app/[locale]/(app)/settings/api/tokens/actions';
import { V2ActiveSessions } from '@/components/v2/settings/active-sessions';
import { V2Topbar } from '@/components/v2/shell/topbar';
import { auth, clerkClient } from '@clerk/nextjs/server';
import { getTranslations } from 'next-intl/server';

export const dynamic = 'force-dynamic';

export type SessionRow = {
  id: string;
  isMobile: boolean;
  device: string;
  ip: string | null;
  location: string | null;
  lastActiveAt: number | null;
  createdAt: number | null;
  isCurrent: boolean;
};

type ClerkActivity = {
  deviceType?: string;
  browserName?: string;
  browserVersion?: string;
  ipAddress?: string;
  city?: string;
  country?: string;
  isMobile?: boolean;
};

export default async function V2SessionsPage() {
  const t = await getTranslations('v2_settings.sessions');
  const { userId, sessionId } = await auth();

  let sessions: SessionRow[] = [];
  if (userId) {
    try {
      const clerk = await clerkClient();
      const result = await clerk.sessions.getSessionList({ userId });
      const raw = (Array.isArray(result) ? result : (result?.data ?? [])) as Array<{
        id: string;
        status: string;
        lastActiveAt: number | null;
        createdAt: number | null;
        latestActivity?: ClerkActivity;
      }>;
      sessions = raw
        .filter((s) => s.status === 'active')
        .map((s) => {
          const a = s.latestActivity ?? {};
          const browser = [a.browserName, a.browserVersion].filter(Boolean).join(' ');
          const device = [a.deviceType, browser].filter(Boolean).join(' · ');
          return {
            id: s.id,
            isMobile: Boolean(a.isMobile),
            device,
            ip: a.ipAddress ?? null,
            location: [a.city, a.country].filter(Boolean).join(', ') || null,
            lastActiveAt: s.lastActiveAt ?? null,
            createdAt: s.createdAt ?? null,
            isCurrent: s.id === sessionId,
          };
        });
    } catch (err) {
      console.error('[settings:sessions] getSessionList failed', err);
    }
  }

  // CLI / integrations section is backed by the real ApiKey table (same source
  // as Settings → API tokens), not a fabricated list.
  const tokens = await listApiTokensAction();

  return (
    <>
      <V2Topbar breadcrumb={t('breadcrumb')} title={t('title')} subtitle={t('subtitle')} />
      <div className="content">
        <V2ActiveSessions sessions={sessions} tokens={tokens} />
      </div>
    </>
  );
}
