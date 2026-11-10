import { V2AddonDetail } from '@/components/v2/settings/addons/detail-shell';
import { V2Topbar } from '@/components/v2/shell/topbar';
import { CreditCard } from 'lucide-react';
import { getTranslations } from 'next-intl/server';

export default async function V2AddonStripePage() {
  const t = await getTranslations('v2_addons.stripe');
  return (
    <>
      <V2Topbar breadcrumb={t('breadcrumb')} title={t('title')} subtitle={t('subtitle')} />
      <div className="content">
        <V2AddonDetail
          logo={<CreditCard size={28} strokeWidth={1.75} />}
          name={t('name')}
          by={t('by')}
          installed
          desc={t('desc')}
          features={t.raw('features') as string[]}
          configRows={[
            {
              label: t('configAccount'),
              node: <input className="input mono" value="acct_••••••••a8f2" readOnly />,
            },
            {
              label: t('configMode'),
              node: (
                <select className="select">
                  <option>{t('modeLive')}</option>
                  <option>{t('modeTest')}</option>
                </select>
              ),
            },
            {
              label: t('configCurrency'),
              node: (
                <select className="select">
                  <option>USD</option>
                  <option>EUR</option>
                  <option>TRY</option>
                </select>
              ),
            },
            { label: t('configPartial'), node: <span className="tog" /> },
          ]}
        />
      </div>
    </>
  );
}
