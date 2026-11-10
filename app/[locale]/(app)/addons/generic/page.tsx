import { V2AddonDetail } from '@/components/v2/settings/addons/detail-shell';
import { V2Topbar } from '@/components/v2/shell/topbar';
import { FileText } from 'lucide-react';
import { getTranslations } from 'next-intl/server';

export default async function V2AddonGenericPage() {
  const t = await getTranslations('v2_addons.generic');
  return (
    <>
      <V2Topbar breadcrumb={t('breadcrumb')} title={t('title')} subtitle={t('subtitle')} />
      <div className="content">
        <V2AddonDetail
          logo={<FileText size={28} strokeWidth={1.75} />}
          name={t('name')}
          by={t('by')}
          installed={false}
          desc={t('desc')}
          features={t.raw('features') as string[]}
          configRows={[
            {
              label: t('configEndpoint'),
              node: (
                <input className="input mono" placeholder="https://hooks.example.com/ishflow" />
              ),
            },
            { label: t('configLabel'), node: <input className="input" placeholder="production" /> },
            {
              label: t('configEnv'),
              node: (
                <select className="select">
                  <option>Production</option>
                  <option>Staging</option>
                  <option>Dev</option>
                </select>
              ),
            },
          ]}
        />
      </div>
    </>
  );
}
