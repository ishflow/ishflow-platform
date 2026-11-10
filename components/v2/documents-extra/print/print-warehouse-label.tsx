import { getTranslations } from 'next-intl/server';

export async function V2PrintWarehouseLabel({ docNo }: { docNo: string }) {
  const t = await getTranslations('v2_documents_extra.print.warehouseLabel');

  return (
    <div className="v2-print-page" style={{ minHeight: 'auto' }}>
      <div className="pp-top">
        <div className="logo">
          <div className="mark">i</div>
          <div className="org">
            <div className="name">{t('orgName')}</div>
            <div className="meta">{t('orgMeta')}</div>
          </div>
        </div>
        <div className="doc">
          <div className="ttl">{t('title')}</div>
          <div className="num">{docNo}</div>
          <div className="date">{t('placeholderDate')}</div>
        </div>
      </div>

      <div
        style={{
          display: 'grid',
          gridTemplateColumns: '1fr 1fr',
          gap: 12,
          marginBottom: 18,
        }}
      >
        {Array.from({ length: 4 }).map((_, i) => (
          <div
            // biome-ignore lint/suspicious/noArrayIndexKey: static placeholder grid
            key={i}
            style={{
              border: '2px solid #111',
              borderRadius: 6,
              padding: '14px 12px',
              minHeight: 120,
              display: 'grid',
              gridTemplateRows: 'auto 1fr auto',
              gap: 6,
            }}
          >
            <div style={{ fontSize: '8.5pt', color: '#666', textTransform: 'uppercase' }}>
              {t('label.sku')} {i + 1}
            </div>
            <div style={{ fontSize: '14pt', fontWeight: 700 }}>—</div>
            <div style={{ fontSize: '9pt', color: '#444' }}>{t('label.bin')}</div>
          </div>
        ))}
      </div>

      <div className="pp-foot">
        <div>{t('foot.page')}</div>
        <div>{t('foot.generated')}</div>
      </div>
    </div>
  );
}
