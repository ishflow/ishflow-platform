import { V2RecentInvoices } from '@/components/v2/dashboard/recent-invoices';
import type { RecentInvoicesPayload } from '@/configs/dashboard/widgets/recent-invoices';
import { getTranslations } from 'next-intl/server';

export async function RecentInvoicesRenderer({
  payload,
}: {
  payload: RecentInvoicesPayload | null;
  locale: string;
  currency: string;
}) {
  const t = await getTranslations('v2_dashboard.recentInvoices');
  const tDoc = await getTranslations('v2_documents.list.status');

  const safe: RecentInvoicesPayload = payload ?? { invoices: [] };

  // The widget payload encodes only the raw status code; resolve to the
  // localised label here so the loader stays serialisable + locale-neutral.
  const localised = safe.invoices.map((inv) => ({
    ...inv,
    status: {
      label:
        inv.status.label === 'POSTED'
          ? tDoc('posted')
          : inv.status.label === 'FAILED'
            ? tDoc('failed')
            : tDoc('saved'),
      tone: inv.status.tone,
    },
  }));

  return (
    <V2RecentInvoices
      title={t('title')}
      exportLabel={t('export')}
      moreLabel="⋯"
      columns={{
        no: t('col.no'),
        partner: t('col.partner'),
        amount: t('col.amount'),
        status: t('col.status'),
        date: t('col.date'),
      }}
      invoices={localised}
    />
  );
}
