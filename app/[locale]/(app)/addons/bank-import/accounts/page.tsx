import { V2BankImportAccounts } from '@/components/v2/settings/addons/bank-import-accounts';
import { V2Topbar } from '@/components/v2/shell/topbar';
import { getTranslations } from 'next-intl/server';

export default async function V2BankImportAccountsPage() {
  const t = await getTranslations('v2_addons.bankImportAccounts');
  return (
    <>
      <V2Topbar breadcrumb={t('breadcrumb')} title={t('title')} subtitle={t('subtitle')} />
      <div className="content">
        <V2BankImportAccounts />
      </div>
    </>
  );
}
