import {
  SaTenantInfoRow,
  SaTenantSection,
} from '@/components/v2/super-admin/tenants/sa-tenant-section';
import { loadSaUser } from '@/lib/v2-super-admin/load-sa-user';
import { Link } from '@/platform/i18n/navigation';
import type { Locale } from '@/platform/metadata';
import { getTranslations } from 'next-intl/server';
import { notFound } from 'next/navigation';

function formatDate(d: Date | null | undefined): string {
  if (!d) return '—';
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

function formatTimestamp(d: Date): string {
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${pad(d.getDate())}.${pad(d.getMonth() + 1)} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export async function renderUserOverviewTab({
  id,
}: {
  id: string;
  locale: Locale;
}) {
  const [t, user] = await Promise.all([
    getTranslations('v2_super_admin.users.detail.overview'),
    loadSaUser(id),
  ]);
  if (!user) notFound();

  const statusPill = user.status === 'deleted' ? 'pill pill-neutral' : 'pill pill-success';
  const emptyMembershipsLabel = t.has('memberships.empty')
    ? t('memberships.empty')
    : 'No tenant memberships.';
  const emptyAuditLabel = t.has('activity.empty')
    ? t('activity.empty')
    : 'No recent platform actions.';

  return (
    <>
      <SaTenantSection title={t('identity.title')} subtitle={t('identity.subtitle')}>
        <SaTenantInfoRow k={t('identity.email')} v={user.email} mono />
        <SaTenantInfoRow k={t('identity.fullName')} v={user.fullName ?? '—'} />
        <SaTenantInfoRow k={t('identity.clerkId')} v={user.clerkId} mono />
        <SaTenantInfoRow
          k={t('identity.status')}
          v={
            <span className={statusPill}>
              {user.status === 'deleted' ? t('identity.statusDeleted') : t('identity.statusActive')}
            </span>
          }
        />
        <SaTenantInfoRow k={t('identity.createdAt')} v={formatDate(user.createdAt)} mono />
        {user.deletedAt ? (
          <SaTenantInfoRow k={t('identity.deletedAt')} v={formatDate(user.deletedAt)} mono />
        ) : null}
      </SaTenantSection>

      <div className="spacer" />

      <SaTenantSection
        title={t('memberships.title')}
        subtitle={t('memberships.subtitle', { count: user.memberships.length })}
      >
        {user.memberships.length === 0 ? (
          <SaTenantInfoRow
            k="—"
            v={<span style={{ color: 'var(--text-muted)' }}>{emptyMembershipsLabel}</span>}
          />
        ) : (
          user.memberships.map((m) => (
            <SaTenantInfoRow
              key={m.membershipId}
              k={formatDate(m.joinedAt)}
              v={
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <Link href={`/super-admin/tenants/${m.tenantId}`} style={{ fontWeight: 600 }}>
                    {m.tenantName}
                  </Link>
                  <span style={{ color: 'var(--text-muted)' }}>
                    {m.roleNames.length > 0 ? m.roleNames.join(', ') : t('memberships.noRole')}
                  </span>
                </div>
              }
            />
          ))
        )}
      </SaTenantSection>

      <div className="spacer" />

      <SaTenantSection title={t('activity.title')} subtitle={t('activity.subtitle')}>
        {user.recentAudit.length === 0 ? (
          <SaTenantInfoRow
            k="—"
            v={<span style={{ color: 'var(--text-muted)' }}>{emptyAuditLabel}</span>}
          />
        ) : (
          user.recentAudit.map((row) => (
            <SaTenantInfoRow
              key={row.id}
              k={formatTimestamp(row.createdAt)}
              v={
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <b style={{ fontWeight: 600 }}>{row.action}</b>
                  <span style={{ color: 'var(--text-muted)' }}>
                    {row.tenantName ?? t('activity.platformWide')}
                  </span>
                </div>
              }
              mono
            />
          ))
        )}
      </SaTenantSection>
    </>
  );
}
