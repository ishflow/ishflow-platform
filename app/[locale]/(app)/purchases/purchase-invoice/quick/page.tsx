import { V2PurchaseInvoiceQuick } from '@/components/v2/documents-extra/purchase-invoice/quick';
import { V2Topbar } from '@/components/v2/shell/topbar';
import { getTranslations } from 'next-intl/server';

export default async function V2PurchaseInvoiceQuickPage() {
  const t = await getTranslations('v2_documents_extra.purchaseInvoice.quick');

  return (
    <>
      <V2Topbar breadcrumb={t('breadcrumb')} title={t('title')} subtitle={t('subtitle')} />
      <div className="content">
        <V2PurchaseInvoiceQuick
          listHref="/purchases/purchase-invoice"
          classicHref="/purchases/purchase-invoice/new"
        />
      </div>
    </>
  );
}
