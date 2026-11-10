import { getTranslations } from 'next-intl/server';

export async function V2PrintReceipt({ docNo }: { docNo: string }) {
  const t = await getTranslations('v2_documents_extra.print.receipt');

  return (
    <div className="v2-print-page">
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

      <div className="pp-parties">
        <div className="box">
          <div className="lbl">{t('parties.from')}</div>
          <div className="name">{t('parties.fromPlaceholder')}</div>
          <div className="meta">{t('parties.fromMeta')}</div>
        </div>
        <div className="box">
          <div className="lbl">{t('parties.basis')}</div>
          <div className="name">{t('parties.basisPlaceholder')}</div>
          <div className="meta">{t('parties.basisMeta')}</div>
        </div>
      </div>

      <div
        style={{
          padding: '24px 18px',
          border: '1px solid #ccc',
          borderRadius: 6,
          marginBottom: 22,
        }}
      >
        <div style={{ fontSize: '9pt', color: '#666', marginBottom: 4 }}>{t('amount.label')}</div>
        <div style={{ fontSize: '18pt', fontWeight: 800 }}>$0.00</div>
        <div style={{ fontSize: '9pt', color: '#666', marginTop: 8 }}>{t('amount.inWords')}</div>
      </div>

      <div className="pp-signatures">
        <div className="sig">
          <div className="lbl">{t('signatures.accountant')}</div>
          <div className="line" />
          <div className="name">________________</div>
        </div>
        <div className="sig">
          <div className="lbl">{t('signatures.cashier')}</div>
          <div className="line" />
          <div className="name">________________</div>
        </div>
      </div>

      <div className="pp-foot">
        <div>{t('foot.page')}</div>
        <div>{t('foot.generated')}</div>
      </div>
    </div>
  );
}
