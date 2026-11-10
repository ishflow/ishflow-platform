import { V2AddonDetail } from '@/components/v2/settings/addons/detail-shell';
import { V2Topbar } from '@/components/v2/shell/topbar';
import { Globe } from 'lucide-react';
import { getTranslations } from 'next-intl/server';

export default async function V2AddonEgovPage() {
  const t = await getTranslations('v2_addons.egov');
  return (
    <>
      <V2Topbar breadcrumb={t('breadcrumb')} title={t('title')} subtitle={t('subtitle')} />
      <div className="content">
        <V2AddonDetail
          logo={<Globe size={28} strokeWidth={1.75} />}
          name={t('name')}
          by={t('by')}
          installed={false}
          desc={t('desc')}
          features={t.raw('features') as string[]}
          configRows={[
            {
              label: t('configEnv'),
              node: (
                <select className="select">
                  <option>{t('envTest')}</option>
                  <option>{t('envLive')}</option>
                </select>
              ),
            },
            {
              label: t('configMailbox'),
              node: <input className="input mono" placeholder="urn:mail:defaultpk@..." />,
            },
            {
              label: t('configSealType'),
              node: (
                <select className="select">
                  <option>{t('sealHsm')}</option>
                  <option>{t('sealSmartCard')}</option>
                </select>
              ),
            },
          ]}
        />
      </div>
    </>
  );
}
