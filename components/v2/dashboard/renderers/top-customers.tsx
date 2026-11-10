import { V2TopCustomers } from '@/components/v2/dashboard/top-customers';
import type { TopCustomersPayload } from '@/configs/dashboard/widgets/top-customers';
import { getTranslations } from 'next-intl/server';

export async function TopCustomersRenderer({
  payload,
}: {
  payload: TopCustomersPayload | null;
  locale: string;
  currency: string;
}) {
  const t = await getTranslations('v2_dashboard.topCustomers');
  const safe: TopCustomersPayload = payload ?? {
    customers: [],
    customerCount: 0,
    changePct: 0,
  };
  return (
    <V2TopCustomers
      title={t('title')}
      viewAllHref="/catalogs/partners"
      viewAllLabel={t('viewAll')}
      totalCountLabel={t('totalLabel', { count: safe.customerCount })}
      changePct={safe.changePct}
      customers={safe.customers}
    />
  );
}
