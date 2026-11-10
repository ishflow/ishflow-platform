import { V2KpiStrip } from '@/components/v2/dashboard/kpi-strip';
import type { KpiStripPayload } from '@/configs/dashboard/widgets/kpi-strip';
import { formatMoney } from '@/lib/format-money';
import { getTranslations } from 'next-intl/server';

export async function KpiStripRenderer({
  payload,
  locale,
  currency,
}: {
  payload: KpiStripPayload | null;
  locale: string;
  currency: string;
}) {
  const t = await getTranslations('v2_dashboard.kpi');
  const safe: KpiStripPayload = payload ?? {
    currency,
    cash: { value: 0, delta: 0 },
    receivables: { value: 0, delta: 0 },
    payables: { value: 0, delta: 0 },
    sales: { value: 0, delta: 0 },
  };
  const items = [
    {
      label: t('cash'),
      value: safe.cash.value === 0 ? '—' : formatMoney(safe.cash.value, locale, safe.currency),
      changePct: safe.cash.delta,
      changeNote: t('note30d'),
    },
    {
      label: t('receivables'),
      value: formatMoney(safe.receivables.value, locale, safe.currency),
      changePct: safe.receivables.delta,
      changeNote: t('note30d'),
    },
    {
      label: t('payables'),
      value: formatMoney(safe.payables.value, locale, safe.currency),
      changePct: safe.payables.delta,
      changeNote: t('note30d'),
    },
    {
      label: t('salesThisMonth'),
      value: formatMoney(safe.sales.value, locale, safe.currency),
      changePct: safe.sales.delta,
      changeNote: t('note30d'),
    },
  ];
  return <V2KpiStrip items={items} />;
}
