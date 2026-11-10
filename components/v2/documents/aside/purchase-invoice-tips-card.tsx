import { getTranslations } from 'next-intl/server';

/**
 * Variant-9 mockup parity: 3-bullet tips card for the purchase-invoice
 * right aside. Uses the generic `item1/2/3` i18n keys (which were authored
 * straight from the purchase mockup) — sales has its own `salesItem*`
 * variant for its sales-specific bullet 2.
 */
export async function PurchaseInvoiceTipsCard() {
  const t = await getTranslations('v2_documents.new.tips');
  return (
    <section className="card">
      <div className="card-header">
        <div className="card-title">{t('title')}</div>
      </div>
      <ul
        style={{
          fontSize: 12.5,
          color: 'var(--text-muted)',
          lineHeight: 1.8,
          paddingLeft: 18,
          listStyle: 'disc',
        }}
      >
        <li>{t('item1')}</li>
        <li>{t('item2')}</li>
        <li>{t('item3')}</li>
      </ul>
    </section>
  );
}
