import { getTranslations } from 'next-intl/server';

export async function V2PrintProforma({ docNo }: { docNo: string }) {
  const t = await getTranslations('v2_documents_extra.print.proforma');

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
          <div className="lbl">{t('parties.seller')}</div>
          <div className="name">{t('orgName')}</div>
          <div className="meta">{t('parties.sellerMeta')}</div>
        </div>
        <div className="box">
          <div className="lbl">{t('parties.buyer')}</div>
          <div className="name">{t('parties.buyerPlaceholder')}</div>
          <div className="meta">{t('parties.buyerMeta')}</div>
        </div>
      </div>

      <table className="pp-lines">
        <thead>
          <tr>
            <th style={{ width: 30 }}>#</th>
            <th>{t('cols.name')}</th>
            <th className="num">{t('cols.qty')}</th>
            <th className="num">{t('cols.price')}</th>
            <th className="num">{t('cols.total')}</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td>1</td>
            <td>—</td>
            <td className="num">0</td>
            <td className="num">$0.00</td>
            <td className="num">$0.00</td>
          </tr>
        </tbody>
      </table>

      <div className="pp-totals">
        <div className="row subtotal">
          <span>{t('totals.subtotal')}</span>
          <span>$0.00</span>
        </div>
        <div className="row grand">
          <span>{t('totals.grand')}</span>
          <span>$0.00</span>
        </div>
      </div>

      <p style={{ fontSize: '9.5pt', color: '#666', marginTop: 14, lineHeight: 1.6 }}>
        {t('disclaimer')}
      </p>

      <div className="pp-foot">
        <div>{t('foot.page')}</div>
        <div>{t('foot.generated')}</div>
      </div>
    </div>
  );
}
