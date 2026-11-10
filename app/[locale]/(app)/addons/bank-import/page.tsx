import { V2AddonDetail } from '@/components/v2/settings/addons/detail-shell';
import { V2Topbar } from '@/components/v2/shell/topbar';
import { Banknote } from 'lucide-react';
import { getTranslations } from 'next-intl/server';
import Link from 'next/link';

export default async function V2AddonBankImportPage() {
  const t = await getTranslations('v2_addons.bankImport');
  return (
    <>
      <V2Topbar breadcrumb={t('breadcrumb')} title={t('title')} subtitle={t('subtitle')} />
      <div className="content">
        <V2AddonDetail
          logo={<Banknote size={28} strokeWidth={1.75} />}
          name={t('name')}
          by={t('by')}
          installed
          desc={t('desc')}
          features={t.raw('features') as string[]}
          configRows={[
            {
              label: t('configDefaultBank'),
              node: (
                <select className="select">
                  <option>İş Bankası TR</option>
                  <option>Garanti TR</option>
                  <option>Sberbank RU</option>
                  <option>{t('bankOther')}</option>
                </select>
              ),
            },
            {
              label: t('configAutoPost'),
              node: (
                <select className="select">
                  <option>{t('autoPostNever')}</option>
                  <option>{t('autoPost100')}</option>
                  <option>{t('autoPost80')}</option>
                </select>
              ),
            },
            {
              label: t('configNewImport'),
              node: (
                <Link href="/addons/bank-import/upload" className="btn btn-primary btn-sm">
                  {t('startFlow')}
                </Link>
              ),
            },
          ]}
          notes={
            <div style={{ fontSize: 13, color: 'var(--text-muted)', lineHeight: 1.55 }}>
              <p>{t('recentTitle')}</p>
              <ul style={{ paddingLeft: 18, marginTop: 6 }}>
                <li>{t('recent1')}</li>
                <li>{t('recent2')}</li>
                <li>{t('recent3')}</li>
              </ul>
            </div>
          }
        />
      </div>
    </>
  );
}
