import { unsubscribeNewsletterV2 } from '@/app/[locale]/(app)/super-admin/cms/_actions';
import { getSaMarketingDict } from '@/app/[locale]/(app)/super-admin/cms/_sa-dict';
import { NewsletterUnsubscribeButton } from '@/components/app/super-admin/marketing/newsletter-unsubscribe-button';
import { SaCmsPageShell } from '@/components/v2/super-admin/cms/sa-cms-card';
import { SaTopbar } from '@/components/v2/super-admin/shell/sa-topbar';
import { SaTenantSection } from '@/components/v2/super-admin/tenants/sa-tenant-section';
import { listNewsletterSubscribers } from '@/platform/super-admin/marketing';
import { Download } from 'lucide-react';
import { getTranslations } from 'next-intl/server';

export const dynamic = 'force-dynamic';

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <div
      style={{
        background: 'var(--surface-2)',
        border: '1px solid var(--border)',
        borderRadius: 10,
        padding: '12px 16px',
        minWidth: 140,
      }}
    >
      <div className="dim" style={{ fontSize: 12, fontWeight: 600 }}>
        {label}
      </div>
      <div style={{ fontSize: 24, fontWeight: 700, marginTop: 2 }}>{value.toLocaleString()}</div>
    </div>
  );
}

export default async function SaCmsNewsletterPage() {
  const t = await getTranslations('v2_super_admin.cms.newsletter');
  const dict = await getSaMarketingDict();
  const m = dict.marketing.newsletter;
  const subscribers = await listNewsletterSubscribers();

  const confirmed = subscribers.filter((s) => s.confirmedAt && !s.unsubscribedAt).length;
  const unsubscribed = subscribers.filter((s) => s.unsubscribedAt).length;

  return (
    <SaCmsPageShell
      topbar={
        <SaTopbar
          breadcrumb={t('breadcrumb')}
          title={t('title')}
          subtitle={t('subtitle')}
          actions={
            <a href="/super-admin/marketing/newsletter/export" className="btn btn-secondary btn-sm">
              <Download size={14} strokeWidth={1.75} />
              {m.exportCsv}
            </a>
          }
        />
      }
    >
      <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', marginBottom: 16 }}>
        <Stat label={t('kpi.subscribers')} value={confirmed} />
        <Stat label={t('kpi.unsubscribes')} value={unsubscribed} />
      </div>

      <SaTenantSection title={t('title')}>
        <table className="data">
          <thead>
            <tr>
              <th>{m.columns.email}</th>
              <th>{m.columns.confirmedAt}</th>
              <th>{m.columns.unsubscribedAt}</th>
              <th>{m.columns.source}</th>
              <th>{m.columns.createdAt}</th>
              <th>{m.columns.actions}</th>
            </tr>
          </thead>
          <tbody>
            {subscribers.length === 0 ? (
              <tr>
                <td colSpan={6} className="dim">
                  {m.empty}
                </td>
              </tr>
            ) : (
              subscribers.map((s) => (
                <tr key={s.id}>
                  <td style={{ fontFamily: 'var(--font-mono)', fontSize: 12, fontWeight: 600 }}>
                    {s.email}
                  </td>
                  <td style={{ fontFamily: 'var(--font-mono)', fontSize: 12 }}>
                    {s.confirmedAt
                      ? s.confirmedAt.toISOString().slice(0, 16).replace('T', ' ')
                      : dict.common.dash}
                  </td>
                  <td>
                    {s.unsubscribedAt ? (
                      <span className="pill pill-neutral">{m.unsubscribed}</span>
                    ) : (
                      dict.common.dash
                    )}
                  </td>
                  <td className="dim">{s.source ?? dict.common.dash}</td>
                  <td style={{ fontFamily: 'var(--font-mono)', fontSize: 12 }}>
                    {s.createdAt.toISOString().slice(0, 16).replace('T', ' ')}
                  </td>
                  <td>
                    {s.unsubscribedAt ? (
                      dict.common.dash
                    ) : (
                      <NewsletterUnsubscribeButton
                        id={s.id}
                        label={m.unsubscribe}
                        confirm={m.unsubscribeConfirm}
                        action={unsubscribeNewsletterV2}
                      />
                    )}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </SaTenantSection>
    </SaCmsPageShell>
  );
}
