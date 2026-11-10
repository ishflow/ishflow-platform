import { V2BankImportOutput } from '@/components/v2/settings/addons/bank-import-output';
import { V2Topbar } from '@/components/v2/shell/topbar';
import { getTranslations } from 'next-intl/server';

export default async function V2BankImportOutputPage() {
  const t = await getTranslations('v2_addons.bankImportOutput');
  return (
    <>
      <V2Topbar breadcrumb={t('breadcrumb')} title={t('title')} subtitle={t('subtitle')} />
      <div className="content">
        <V2BankImportOutput />
      </div>
    </>
  );
}
