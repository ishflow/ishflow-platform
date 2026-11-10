import { V2AddonDetail } from '@/components/v2/settings/addons/detail-shell';
import { V2Topbar } from '@/components/v2/shell/topbar';
import { QrCode } from 'lucide-react';
import { getTranslations } from 'next-intl/server';

export default async function V2AddonQrPage() {
  const t = await getTranslations('v2_addons.qr');
  return (
    <>
      <V2Topbar breadcrumb={t('breadcrumb')} title={t('title')} subtitle={t('subtitle')} />
      <div className="content">
        <V2AddonDetail
          logo={<QrCode size={28} strokeWidth={1.75} />}
          name={t('name')}
          by={t('by')}
          installed={false}
          desc={t('desc')}
          features={t.raw('features') as string[]}
          configRows={[
            {
              label: t('configStandard'),
              node: (
                <select className="select">
                  <option>TR FAST</option>
                  <option>RU СБП</option>
                  <option>EU SEPA EPC</option>
                </select>
              ),
            },
            {
              label: t('configIban'),
              node: <input className="input mono" placeholder="TR00 0000 ..." />,
            },
            {
              label: t('configPosition'),
              node: (
                <select className="select">
                  <option>{t('positionBottomRight')}</option>
                  <option>{t('positionTopBanner')}</option>
                  <option>{t('positionSecondPage')}</option>
                </select>
              ),
            },
          ]}
        />
      </div>
    </>
  );
}
