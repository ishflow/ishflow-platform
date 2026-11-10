import { V2AddonDetail } from '@/components/v2/settings/addons/detail-shell';
import { V2Topbar } from '@/components/v2/shell/topbar';
import { Sparkles } from 'lucide-react';
import { getTranslations } from 'next-intl/server';

export default async function V2AddonAiOcrPage() {
  const t = await getTranslations('v2_addons.aiOcr');
  return (
    <>
      <V2Topbar breadcrumb={t('breadcrumb')} title={t('title')} subtitle={t('subtitle')} />
      <div className="content">
        <V2AddonDetail
          logo={<Sparkles size={28} strokeWidth={1.75} />}
          name={t('name')}
          by={t('by')}
          installed
          desc={t('desc')}
          features={t.raw('features') as string[]}
          configRows={[
            {
              label: t('configPrimaryLang'),
              node: (
                <select className="select">
                  <option>{t('langAuto')}</option>
                  <option>{t('langTr')}</option>
                  <option>{t('langRu')}</option>
                  <option>{t('langEn')}</option>
                </select>
              ),
            },
            {
              label: t('configConfidence'),
              node: (
                <select className="select">
                  <option>{t('confAsk80')}</option>
                  <option>{t('confAsk90')}</option>
                  <option>{t('confAuto70')}</option>
                </select>
              ),
            },
            { label: t('configLearning'), node: <span className="tog is-on" /> },
          ]}
          notes={
            <p style={{ fontSize: 13, color: 'var(--text-muted)', lineHeight: 1.55 }}>
              {t('notes')}
            </p>
          }
        />
      </div>
    </>
  );
}
