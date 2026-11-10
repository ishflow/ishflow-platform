import {
  SaTenantInfoRow,
  SaTenantSection,
} from '@/components/v2/super-admin/tenants/sa-tenant-section';
import { loadSaUser } from '@/lib/v2-super-admin/load-sa-user';
import { withBypass } from '@/platform/db/tenant-context';
import type { Locale } from '@/platform/metadata';
import { getTranslations } from 'next-intl/server';
import { notFound } from 'next/navigation';

const AUDIT_PAGE_SIZE = 100;

function formatTimestamp(d: Date): string {
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${pad(d.getDate())}.${pad(d.getMonth() + 1)} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

/**
 * Full platform audit history tab. Shows up to 100 most-recent
 * PlatformAuditLog rows authored by this user (by actorClerkId), with
 * tenant names resolved via a batched lookup.
 *
 * Distinct from the overview tab's last-10 snippet — meant for "show me
 * everything this operator did across the platform".
 */
export async function renderUserAuditTab({
  id,
}: {
  id: string;
  locale: Locale;
}) {
  const [t, user] = await Promise.all([
    getTranslations('v2_super_admin.users.detail.auditTab'),
    loadSaUser(id),
  ]);
  if (!user) notFound();

  const { rows, tenantNameById } = await withBypass(async (tx) => {
    const txTyped = tx as {
      platformAuditLog: {
        findMany: (
          args: unknown,
        ) => Promise<
          Array<{ id: string; action: string; tenantId: string | null; createdAt: Date }>
        >;
      };
      tenant: {
        findMany: (args: unknown) => Promise<Array<{ id: string; name: string }>>;
      };
    };
    const records = await txTyped.platformAuditLog.findMany({
      where: { actorClerkId: user.clerkId },
      orderBy: { createdAt: 'desc' },
      take: AUDIT_PAGE_SIZE,
      select: { id: true, action: true, tenantId: true, createdAt: true },
    });
    const tenantIds = Array.from(
      new Set(records.map((r) => r.tenantId).filter((x): x is string => x !== null)),
    );
    const tenants = tenantIds.length
      ? await txTyped.tenant.findMany({
          where: { id: { in: tenantIds } },
          select: { id: true, name: true },
        })
      : [];
    return { rows: records, tenantNameById: new Map(tenants.map((tn) => [tn.id, tn.name])) };
  });

  const empty = t.has('empty') ? t('empty') : 'No platform audit entries.';
  const platformWide = t.has('platformWide') ? t('platformWide') : 'platform-wide';

  return (
    <SaTenantSection title={t('title')} subtitle={t('subtitle', { count: rows.length })}>
      {rows.length === 0 ? (
        <SaTenantInfoRow k="—" v={<span style={{ color: 'var(--text-muted)' }}>{empty}</span>} />
      ) : (
        rows.map((r) => (
          <SaTenantInfoRow
            key={r.id}
            k={formatTimestamp(r.createdAt)}
            v={
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <b style={{ fontWeight: 600 }}>{r.action}</b>
                <span style={{ color: 'var(--text-muted)' }}>
                  {r.tenantId ? (tenantNameById.get(r.tenantId) ?? '—') : platformWide}
                </span>
              </div>
            }
            mono
          />
        ))
      )}
    </SaTenantSection>
  );
}
