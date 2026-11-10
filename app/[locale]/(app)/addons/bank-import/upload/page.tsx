import { V2BankImportUpload } from '@/components/v2/settings/addons/bank-import-upload';
import { V2Topbar } from '@/components/v2/shell/topbar';
import { getTranslations } from 'next-intl/server';

export default async function V2BankImportUploadPage() {
  const t = await getTranslations('v2_addons.bankImportUpload');
  return (
    <>
      <V2Topbar breadcrumb={t('breadcrumb')} title={t('title')} subtitle={t('subtitle')} />
      <div className="content">
        <V2BankImportUpload />
      </div>
    </>
  );
}
