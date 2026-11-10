import { getTranslations } from 'next-intl/server';

export async function V2PrintDelivery({ docNo }: { docNo: string }) {
  const t = await getTranslations('v2_documents_extra.print.delivery');

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
          <div className="lbl">{t('parties.to')}</div>
          <div className="name">{t('parties.toPlaceholder')}</div>
          <div className="meta">{t('parties.toMeta')}</div>
        </div>
      </div>

      <table className="pp-lines">
        <thead>
          <tr>
            <th style={{ width: 30 }}>#</th>
            <th>{t('cols.product')}</th>
            <th>{t('cols.sku')}</th>
            <th className="num">{t('cols.qty')}</th>
            <th className="num">{t('cols.weight')}</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td>1</td>
            <td>—</td>
            <td>—</td>
            <td className="num">0</td>
            <td className="num">0.00 kg</td>
          </tr>
        </tbody>
      </table>

      <div className="pp-signatures">
        <div className="sig">
          <div className="lbl">{t('signatures.sender')}</div>
          <div className="line" />
          <div className="name">________________</div>
        </div>
        <div className="sig">
          <div className="lbl">{t('signatures.carrier')}</div>
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
