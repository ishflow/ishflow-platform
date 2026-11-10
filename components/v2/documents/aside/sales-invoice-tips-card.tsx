import { getTranslations } from 'next-intl/server';

/**
 * Variant-9 mockup parity: 3-bullet tips card for the sales-invoice right
 * aside. Lives outside V2DocumentWizard because the bullets are sales-
 * specific, not a generic property of any document.
 */
export async function SalesInvoiceTipsCard() {
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
        <li>{t('salesItem1')}</li>
        <li>{t('salesItem2')}</li>
        <li>{t('salesItem3')}</li>
      </ul>
    </section>
  );
}
