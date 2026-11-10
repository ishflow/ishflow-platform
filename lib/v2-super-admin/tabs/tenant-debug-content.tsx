import { Button } from '@/components/ui/button';
import {
  SaTenantInfoRow,
  SaTenantSection,
} from '@/components/v2/super-admin/tenants/sa-tenant-section';
import { loadSaTenantDebug } from '@/lib/v2-super-admin/load-tenant-debug';
import type { Locale } from '@/platform/metadata';
import { getTranslations } from 'next-intl/server';
import { notFound } from 'next/navigation';

function formatTimestamp(d: Date | null): string {
  if (!d) return '—';
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export async function renderTenantDebugTab({
  id,
}: {
  id: string;
  locale: Locale;
}) {
  const [t, data] = await Promise.all([
    getTranslations('v2_super_admin.tenants.detail.debug'),
    loadSaTenantDebug(id),
  ]);
  if (!data) notFound();

  const rlsLine = data.rls.ok ? `role=${data.rls.role}` : `❌ ${data.rls.error ?? 'unknown error'}`;
  const rlsHealthy = data.rls.ok && data.rls.role === 'canalog_app';

  return (
    <>
      <SaTenantSection title={t('runtime.title')}>
        <SaTenantInfoRow k={t('runtime.region')} v={data.runtime.region} mono />
        <SaTenantInfoRow k={t('runtime.nodeVersion')} v={data.runtime.nodeVersion} mono />
        <SaTenantInfoRow k={t('runtime.nextEnv')} v={data.runtime.nextEnv} mono />
        <SaTenantInfoRow
          k={t('runtime.devBypass')}
          v={data.runtime.devBypassActive ? 'ACTIVE — localhost only' : 'off'}
          mono
        />
        <SaTenantInfoRow k={t('runtime.clerkOrgId')} v={data.tenant.clerkOrgId} mono />
        <SaTenantInfoRow
          k={t('runtime.lastActivityAt')}
          v={formatTimestamp(data.tenant.lastActivityAt)}
        />
        <SaTenantInfoRow k={t('runtime.createdAt')} v={formatTimestamp(data.tenant.createdAt)} />
      </SaTenantSection>

      <div className="spacer" />

      <SaTenantSection title={t('rls.title')} subtitle={t('rls.subtitle')}>
        <SaTenantInfoRow
          k={t('rls.probe')}
          v={
            <span
              className={
                rlsHealthy
                  ? 'pill pill-success'
                  : data.rls.ok
                    ? 'pill pill-warning'
                    : 'pill pill-neutral'
              }
            >
              {rlsLine}
            </span>
          }
          mono
        />
        {!rlsHealthy && data.rls.ok ? (
          <SaTenantInfoRow k={t('rls.warning')} v={t('rls.expectedRoleHint')} mono />
        ) : null}
      </SaTenantSection>

      <div className="spacer" />

      <SaTenantSection title={t('counts.title')} subtitle={t('counts.subtitle')}>
        <SaTenantInfoRow k={t('counts.memberships')} v={String(data.counts.memberships)} mono />
        <SaTenantInfoRow k={t('counts.salesInvoices')} v={String(data.counts.salesInvoices)} mono />
        <SaTenantInfoRow
          k={t('counts.purchaseInvoices')}
          v={String(data.counts.purchaseInvoices)}
          mono
        />
        <SaTenantInfoRow k={t('counts.auditLog')} v={String(data.counts.auditLog)} mono />
        <SaTenantInfoRow k={t('counts.addons')} v={String(data.counts.addons)} mono />
        <SaTenantInfoRow k={t('counts.tags')} v={String(data.counts.tags)} mono />
        <SaTenantInfoRow k={t('counts.notes')} v={String(data.counts.notes)} mono />
        <SaTenantInfoRow k={t('counts.featureKills')} v={String(data.counts.featureKills)} mono />
      </SaTenantSection>

      <div className="spacer" />

      <SaTenantSection title={t('tools.title')} subtitle={t('tools.subtitle')}>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', padding: '8px 0' }}>
          <Button
            type="button"
            size="sm"
            variant="secondary"
            disabled
            title={t('tools.deferredHint')}
          >
            {t('tools.recomputeBalances')}
          </Button>
          <Button
            type="button"
            size="sm"
            variant="secondary"
            disabled
            title={t('tools.deferredHint')}
          >
            {t('tools.rebuildSearchIndex')}
          </Button>
          <Button
            type="button"
            size="sm"
            variant="secondary"
            disabled
            title={t('tools.deferredHint')}
          >
            {t('tools.clearRedisCache')}
          </Button>
          <Button
            type="button"
            size="sm"
            variant="secondary"
            disabled
            title={t('tools.deferredHint')}
          >
            {t('tools.replaySync')}
          </Button>
          <Button
            type="button"
            size="sm"
            variant="destructive"
            disabled
            title={t('tools.deferredHint')}
          >
            {t('tools.forceLogoutAll')}
          </Button>
        </div>
      </SaTenantSection>
    </>
  );
}
