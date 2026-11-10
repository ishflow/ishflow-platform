import { SaCmsPageShell } from '@/components/v2/super-admin/cms/sa-cms-card';
import { SaKpiStrip } from '@/components/v2/super-admin/dashboard/sa-kpi-strip';
import { SaTopbar } from '@/components/v2/super-admin/shell/sa-topbar';
import {
  SaTenantInfoRow,
  SaTenantSection,
} from '@/components/v2/super-admin/tenants/sa-tenant-section';
import { Link } from '@/platform/i18n/navigation';
import { Activity, KeyRound, Settings } from 'lucide-react';
import { getTranslations } from 'next-intl/server';

export default async function SaSystemOverviewPage() {
  const t = await getTranslations('v2_super_admin.system');
  return (
    <SaCmsPageShell
      topbar={
        <SaTopbar
          breadcrumb={t('breadcrumb')}
          title={t('title')}
          subtitle={t('subtitle')}
          actions={
            <>
              <Link href="/super-admin/system/settings" className="btn btn-secondary btn-sm">
                <Settings size={14} strokeWidth={1.75} />
                {t('actions.settings')}
              </Link>
              <Link href="/super-admin/system/api-keys" className="btn btn-secondary btn-sm">
                <KeyRound size={14} strokeWidth={1.75} />
                {t('actions.apiKeys')}
              </Link>
            </>
          }
        />
      }
    >
      <SaKpiStrip
        items={[
          {
            label: t('kpi.apiP95'),
            value: '124 ms',
            change: { direction: 'down', text: '8 ms', note: t('kpi.note.last24h') },
          },
          {
            label: t('kpi.dbP95'),
            value: '38 ms',
            change: { direction: 'flat', text: '0 ms', note: t('kpi.note.last24h') },
          },
          {
            label: t('kpi.fnInvocations24h'),
            value: '1.42M',
            change: { direction: 'up', text: '4.2%', note: t('kpi.note.fromYesterday') },
          },
          {
            label: t('kpi.errorRate24h'),
            value: '0.03%',
            change: { direction: 'down', text: '0.01 pp', note: t('kpi.note.fromYesterday') },
          },
        ]}
      />

      <SaTenantSection
        title={t('queues.title')}
        action={
          <span
            className="dim"
            style={{ fontSize: 12, display: 'inline-flex', alignItems: 'center', gap: 4 }}
          >
            <Activity size={12} strokeWidth={1.75} /> {t('queues.live')}
          </span>
        }
      >
        <SaTenantInfoRow k="vercel.queue.emails" v="2 jobs · avg 1.4s" mono />
        <SaTenantInfoRow k="vercel.queue.webhooks" v="0 jobs · avg 0.2s" mono />
        <SaTenantInfoRow k="cron.dunning (hourly)" v="last run 17.05 10:00 · OK" mono />
        <SaTenantInfoRow k="cron.cleanup (00:00 daily)" v="last run 17.05 00:00 · OK" mono />
      </SaTenantSection>
    </SaCmsPageShell>
  );
}
