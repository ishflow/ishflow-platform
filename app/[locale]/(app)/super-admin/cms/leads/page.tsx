import { updateLeadStatusV2 } from '@/app/[locale]/(app)/super-admin/cms/_actions';
import { getSaMarketingDict } from '@/app/[locale]/(app)/super-admin/cms/_sa-dict';
import { LeadStatusSelect } from '@/components/app/super-admin/marketing/lead-status-select';
import { SaCmsPageShell } from '@/components/v2/super-admin/cms/sa-cms-card';
import { SaTopbar } from '@/components/v2/super-admin/shell/sa-topbar';
import { SaTenantSection } from '@/components/v2/super-admin/tenants/sa-tenant-section';
import { Link } from '@/platform/i18n/navigation';
import {
  LEAD_STATUSES,
  type LeadStatus,
  listMarketingLeads,
} from '@/platform/super-admin/marketing';
import { getTranslations } from 'next-intl/server';

export const dynamic = 'force-dynamic';

export default async function SaCmsLeadsPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string }>;
}) {
  const { status } = await searchParams;
  const t = await getTranslations('v2_super_admin.cms.leads');
  const dict = await getSaMarketingDict();
  const m = dict.marketing.leads;
  const leads = await listMarketingLeads({ status });

  return (
    <SaCmsPageShell
      topbar={
        <SaTopbar
          breadcrumb={t('breadcrumb')}
          title={t('title')}
          subtitle={t('subtitle', { count: leads.length })}
          actions={
            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
              <Link
                href="/super-admin/cms/leads"
                className={`btn btn-sm ${!status ? 'btn-primary' : 'btn-secondary'}`}
              >
                {m.filterAll}
              </Link>
              {LEAD_STATUSES.map((s) => (
                <Link
                  key={s}
                  href={`/super-admin/cms/leads?status=${s}`}
                  className={`btn btn-sm ${status === s ? 'btn-primary' : 'btn-secondary'}`}
                >
                  {m.statusLabels[s as LeadStatus]}
                </Link>
              ))}
            </div>
          }
        />
      }
    >
      <SaTenantSection title={t('card.title')}>
        <table className="data">
          <thead>
            <tr>
              <th>{m.columns.when}</th>
              <th>{m.columns.name}</th>
              <th>{m.columns.email}</th>
              <th>{m.columns.company}</th>
              <th>{m.columns.source}</th>
              <th>{m.columns.message}</th>
              <th>{m.columns.status}</th>
            </tr>
          </thead>
          <tbody>
            {leads.length === 0 ? (
              <tr>
                <td colSpan={7} className="dim">
                  {m.empty}
                </td>
              </tr>
            ) : (
              leads.map((l) => (
                <tr key={l.id}>
                  <td style={{ fontFamily: 'var(--font-mono)', fontSize: 12 }}>
                    {l.createdAt.toISOString().slice(0, 16).replace('T', ' ')}
                  </td>
                  <td style={{ fontWeight: 600 }}>{l.name}</td>
                  <td style={{ fontFamily: 'var(--font-mono)', fontSize: 12 }}>{l.email}</td>
                  <td>{l.company ?? dict.common.dash}</td>
                  <td className="dim">{l.source ?? dict.common.dash}</td>
                  <td style={{ maxWidth: 280 }}>
                    <span className="dim">
                      {l.message.length > 90 ? `${l.message.slice(0, 90)}…` : l.message}
                    </span>
                  </td>
                  <td>
                    <LeadStatusSelect
                      id={l.id}
                      current={l.status}
                      dict={m}
                      action={updateLeadStatusV2}
                    />
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
