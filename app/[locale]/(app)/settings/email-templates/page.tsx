import { V2EmailTemplates } from '@/components/v2/settings/email-templates';
import { V2Topbar } from '@/components/v2/shell/topbar';
import { getTranslations } from 'next-intl/server';

export default async function V2EmailTemplatesPage() {
  const t = await getTranslations('v2_settings.emailTemplates');
  return (
    <>
      <V2Topbar breadcrumb={t('breadcrumb')} title={t('title')} subtitle={t('subtitle')} />
      <div className="content">
        <V2EmailTemplates />
      </div>
    </>
  );
}
