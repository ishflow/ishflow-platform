import { V2AddonDetail } from '@/components/v2/settings/addons/detail-shell';
import { V2Topbar } from '@/components/v2/shell/topbar';
import { Boxes, Building2, Upload } from 'lucide-react';
import { getTranslations } from 'next-intl/server';
import Link from 'next/link';

export default async function V2Addon1CPage() {
  const t = await getTranslations('v2_addons.oneC');
  return (
    <>
      <V2Topbar breadcrumb={t('breadcrumb')} title={t('title')} subtitle={t('subtitle')} />
      <div className="content">
        <section className="card" style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
          <div style={{ flex: 1 }}>
            <div className="card-title">{t('importCardTitle')}</div>
            <p className="dim" style={{ fontSize: 13, marginTop: 4 }}>
              {t('importCardDesc')}
            </p>
          </div>
          <Link className="btn btn-primary" href="/addons/1c/import">
            <Upload size={16} strokeWidth={1.75} />
            {t('importCardCta')}
          </Link>
        </section>

        <section
          className="card"
          style={{ display: 'flex', alignItems: 'center', gap: 16, marginTop: 16 }}
        >
          <div style={{ flex: 1 }}>
            <div className="card-title">{t('openingStockCardTitle')}</div>
            <p className="dim" style={{ fontSize: 13, marginTop: 4 }}>
              {t('openingStockCardDesc')}
            </p>
          </div>
          <Link className="btn btn-primary" href="/addons/1c/opening-stock">
            <Boxes size={16} strokeWidth={1.75} />
            {t('openingStockCardCta')}
          </Link>
        </section>

        <div className="spacer" />

        <V2AddonDetail
          logo={<Building2 size={28} strokeWidth={1.75} />}
          name={t('name')}
          by={t('by')}
          installed
          desc={t('desc')}
          features={t.raw('features') as string[]}
          notes={
            <p style={{ fontSize: 13, color: 'var(--text-muted)', lineHeight: 1.55 }}>
              {t.rich('notes', { code: (chunks) => <code>{chunks}</code> })}
            </p>
          }
        />
      </div>
    </>
  );
}
