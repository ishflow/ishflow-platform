import { BankAccountForm } from '@/components/v2/catalogs/bank-accounts/bank-account-form';
import { V2Topbar } from '@/components/v2/shell/topbar';
import type { Locale } from '@/platform/metadata';
import { getTranslations, setRequestLocale } from 'next-intl/server';

export const dynamic = 'force-dynamic';

export default async function V2BankAccountNewPage({
  params,
}: {
  params: Promise<{ locale: Locale }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations('v2_catalogs.bankAccounts');
  return (
    <>
      <V2Topbar breadcrumb={t('breadcrumb')} title={t('newTitle')} />
      <div className="content">
        <BankAccountForm listHref="/catalogs/bank-accounts" />
      </div>
    </>
  );
}
