import { getTranslations } from 'next-intl/server';

export async function V2PrintInvoice({ docNo }: { docNo: string }) {
  const t = await getTranslations('v2_documents_extra.print.invoice');

  const lines = [
    {
      no: 1,
      name: 'Samsung Galaxy S24 256GB Black',
      sku: 'SKU-0001',
      qty: 12,
      price: '$1,300.00',
      vat: '0%',
      total: '$15,600.00',
    },
    {
      no: 2,
      name: 'iPhone 17 Pro Max 512GB Titanium',
      sku: 'SKU-0002',
      qty: 8,
      price: '$2,220.00',
      vat: '0%',
      total: '$17,760.00',
    },
    {
      no: 3,
      name: 'Apple Watch Ultra 2 49mm',
      sku: 'SKU-0014',
      qty: 5,
      price: '$820.00',
      vat: '0%',
      total: '$4,100.00',
    },
  ];

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
            <th>{t('cols.sku')}</th>
            <th className="num">{t('cols.qty')}</th>
            <th className="num">{t('cols.price')}</th>
            <th className="num">{t('cols.vat')}</th>
            <th className="num">{t('cols.total')}</th>
          </tr>
        </thead>
        <tbody>
          {lines.map((l) => (
            <tr key={l.no}>
              <td>{l.no}</td>
              <td>{l.name}</td>
              <td>{l.sku}</td>
              <td className="num">{l.qty}</td>
              <td className="num">{l.price}</td>
              <td className="num">{l.vat}</td>
              <td className="num">{l.total}</td>
            </tr>
          ))}
        </tbody>
      </table>

      <div className="pp-totals">
        <div className="row subtotal">
          <span>{t('totals.subtotal')}</span>
          <span>$37,460.00</span>
        </div>
        <div className="row">
          <span>{t('totals.discount')}</span>
          <span>−$0.00</span>
        </div>
        <div className="row">
          <span>{t('totals.vat')}</span>
          <span>$0.00</span>
        </div>
        <div className="row grand">
          <span>{t('totals.grand')}</span>
          <span>$37,460.00</span>
        </div>
      </div>

      <div className="pp-signatures">
        <div className="sig">
          <div className="lbl">{t('signatures.accountant')}</div>
          <div className="line" />
          <div className="name">________________</div>
        </div>
        <div className="sig">
          <div className="lbl">{t('signatures.receiver')}</div>
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
