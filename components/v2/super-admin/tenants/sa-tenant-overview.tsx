import type { SaTenantRecord } from '@/lib/v2-super-admin/load-tenant';
import type { TenantStatus } from '@prisma/client';
import { CalendarPlus, DollarSign, FileText, Globe, TrendingUp, User } from 'lucide-react';
import { getTranslations } from 'next-intl/server';
import { SaOperatorBar } from './sa-operator-bar';

const cardStyle: React.CSSProperties = {
  background: 'var(--surface)',
  border: '1px solid var(--border)',
  borderRadius: 12,
  padding: 14,
};

const statHeadStyle: React.CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  gap: 8,
  color: 'var(--text-muted)',
  marginBottom: 10,
};

const statIconStyle: React.CSSProperties = {
  width: 28,
  height: 28,
  borderRadius: 7,
  background: 'var(--accent-soft)',
  color: 'var(--accent)',
  display: 'grid',
  placeItems: 'center',
};

const statLabelStyle: React.CSSProperties = {
  fontSize: 10.5,
  fontWeight: 700,
  textTransform: 'uppercase',
  letterSpacing: '0.04em',
};

const statValueStyle: React.CSSProperties = {
  fontSize: 22,
  fontWeight: 800,
  letterSpacing: '-0.02em',
  lineHeight: 1.1,
};

const statSubStyle: React.CSSProperties = {
  fontSize: 11.5,
  color: 'var(--text-muted)',
  marginTop: 4,
};

const infoRowStyle: React.CSSProperties = {
  display: 'grid',
  gridTemplateColumns: '180px 1fr',
  gap: 14,
  padding: '10px 0',
  fontSize: 13.5,
};

/**
 * Tenant detail Detay (overview) sub-page.
 *
 * Mirrors sa-tenant-detay.html main column: header avatar/name/pills,
 * 6-card stats grid, info-rows card, tag-pills card, operator action bar.
 * All copy threaded through v2_super_admin.tenants.detail.overview.* i18n.
 */
function capitalizePlan(plan: string): string {
  return plan.charAt(0).toUpperCase() + plan.slice(1);
}

export async function SaTenantOverview({
  tenant,
  status,
  members,
}: {
  tenant: SaTenantRecord;
  status: TenantStatus;
  members: Array<{ userId: string; email: string; fullName: string | null }>;
}) {
  const t = await getTranslations('v2_super_admin.tenants.detail.overview');
  const initials = tenant.name
    .split(' ')
    .map((p) => p[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();

  return (
    <>
      <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 14 }}>
        <div
          style={{
            width: 56,
            height: 56,
            borderRadius: 14,
            background: 'var(--accent)',
            color: 'var(--accent-on)',
            display: 'grid',
            placeItems: 'center',
            fontWeight: 800,
            fontSize: 22,
          }}
        >
          {initials}
        </div>
        <div>
          <div
            style={{
              fontSize: 22,
              fontWeight: 800,
              letterSpacing: '-0.02em',
              lineHeight: 1.1,
            }}
          >
            {tenant.name}
          </div>
          <div
            style={{
              fontFamily: 'var(--font-mono)',
              fontSize: 12,
              color: 'var(--text-muted)',
              marginTop: 4,
            }}
          >
            {tenant.slug} · {tenant.id.slice(0, 12)}…
          </div>
          <div style={{ display: 'flex', gap: 6, marginTop: 8 }}>
            <span className="pill">{t(`operatorBar.statuses.${status}`)}</span>
            <span className="pill pill-info">{capitalizePlan(tenant.plan)}</span>
            <span className="pill">{t('pill.defaultCurrency', { currency: tenant.currency })}</span>
          </div>
        </div>
      </div>

      <section
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(6, 1fr)',
          gap: 12,
          marginBottom: 18,
        }}
      >
        <div style={cardStyle}>
          <div style={statHeadStyle}>
            <span style={statIconStyle}>
              <CalendarPlus size={14} strokeWidth={1.75} />
            </span>
            <span style={statLabelStyle}>{t('stat.created.label')}</span>
          </div>
          <div style={statValueStyle}>{tenant.createdAt.toISOString().slice(0, 10)}</div>
          <div style={statSubStyle}>{t('stat.created.sub')}</div>
        </div>
        <div style={cardStyle}>
          <div style={statHeadStyle}>
            <span style={statIconStyle}>
              <DollarSign size={14} strokeWidth={1.75} />
            </span>
            <span style={statLabelStyle}>{t('stat.currency.label')}</span>
          </div>
          <div style={statValueStyle}>{tenant.currency}</div>
          <div style={statSubStyle}>{t('stat.currency.sub')}</div>
        </div>
        <div style={cardStyle}>
          <div style={statHeadStyle}>
            <span style={statIconStyle}>
              <Globe size={14} strokeWidth={1.75} />
            </span>
            <span style={statLabelStyle}>{t('stat.locale.label')}</span>
          </div>
          <div style={statValueStyle}>{tenant.defaultLocale}</div>
          <div style={statSubStyle}>{t('stat.locale.sub')}</div>
        </div>
        <div style={cardStyle}>
          <div style={statHeadStyle}>
            <span style={statIconStyle}>
              <User size={14} strokeWidth={1.75} />
            </span>
            <span style={statLabelStyle}>{t('stat.owners.label')}</span>
          </div>
          <div style={statValueStyle}>{tenant.members}</div>
          <div style={statSubStyle}>{t('stat.owners.sub')}</div>
        </div>
        <div style={cardStyle}>
          <div style={statHeadStyle}>
            <span style={statIconStyle}>
              <FileText size={14} strokeWidth={1.75} />
            </span>
            <span style={statLabelStyle}>{t('stat.totalDocs.label')}</span>
          </div>
          <div style={statValueStyle}>{tenant.invoices}</div>
          <div style={statSubStyle}>{t('stat.totalDocs.sub')}</div>
        </div>
        <div style={cardStyle}>
          <div style={statHeadStyle}>
            <span style={statIconStyle}>
              <TrendingUp size={14} strokeWidth={1.75} />
            </span>
            <span style={statLabelStyle}>{t('stat.mrr.label')}</span>
          </div>
          <div style={statValueStyle}>${tenant.mrrUsd.toFixed(2)}</div>
          <div style={statSubStyle}>{t('stat.mrr.sub')}</div>
        </div>
      </section>

      <section className="card">
        <div className="card-header">
          <div className="card-title">{t('info.title')}</div>
          <button type="button" className="btn btn-ghost btn-sm">
            {t('info.edit')}
          </button>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column' }}>
          <SaInfoRow k={t('info.row.companyName')} v={tenant.name} />
          <SaInfoRow k={t('info.row.ownerEmail')} v={members[0]?.email ?? '—'} />
          <SaInfoRow
            k={t('info.row.lastActivity')}
            v={
              tenant.lastActivityAt
                ? tenant.lastActivityAt.toISOString().slice(0, 16).replace('T', ' ')
                : '—'
            }
          />
        </div>
      </section>

      <div className="spacer" />

      <section className="card">
        <div className="card-header">
          <div className="card-title">{t('tags.title')}</div>
          <span className="dim" style={{ fontSize: 12 }}>
            {t('tags.subtitle')}
          </span>
        </div>
        <div style={{ display: 'flex', gap: 8, marginBottom: 14 }}>
          <input
            type="text"
            placeholder={t('tags.addPlaceholder')}
            style={{
              flex: 1,
              padding: '9px 12px',
              border: '1px solid var(--border)',
              borderRadius: 8,
              background: 'var(--surface)',
              fontSize: 13,
            }}
          />
          <button type="button" className="btn btn-secondary btn-sm">
            {t('tags.addButton')}
          </button>
        </div>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }} />
      </section>

      <div
        style={{
          position: 'sticky',
          bottom: 0,
          background: 'var(--bg-app)',
          borderTop: '1px solid var(--border)',
          padding: '14px 0',
          marginTop: 18,
          zIndex: 10,
        }}
      >
        <SaOperatorBar
          tenantId={tenant.id}
          tenantSlug={tenant.slug}
          status={status}
          statusLabel={t(`operatorBar.statuses.${status}`)}
          planMetaLine={t('operatorBar.planMeta', { plan: capitalizePlan(tenant.plan) })}
          members={members}
        />
      </div>
    </>
  );
}

function SaInfoRow({ k, v, mono }: { k: string; v: string; mono?: boolean }) {
  return (
    <div style={{ ...infoRowStyle, borderTop: '1px solid var(--border)' }}>
      <div style={{ color: 'var(--text-muted)', fontWeight: 600, fontSize: 12.5 }}>{k}</div>
      <div
        style={
          mono
            ? { fontWeight: 500, fontFamily: 'var(--font-mono)', fontSize: 12 }
            : { fontWeight: 500 }
        }
      >
        {v}
      </div>
    </div>
  );
}
