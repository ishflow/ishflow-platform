import { Link } from '@/platform/i18n/navigation';
import { ChevronLeft, ChevronRight, Download, MoreHorizontal } from 'lucide-react';

type DocRow = {
  no: string;
  date: string;
  type: 'sale' | 'payment' | 'refund';
  amount: string;
  status: { label: string; tone: 'success' | 'warning' | 'neutral' };
};

const ROWS: DocRow[] = [
  {
    no: 'SALE-000044',
    date: '15 May 2026',
    type: 'sale',
    amount: '$12,400.00',
    status: { label: 'Açık', tone: 'warning' },
  },
  {
    no: 'SALE-000038',
    date: '28 Nis 2026',
    type: 'sale',
    amount: '$8,800.00',
    status: { label: 'Kapalı', tone: 'success' },
  },
  {
    no: 'PAY-000022',
    date: '28 Nis 2026',
    type: 'payment',
    amount: '$8,800.00',
    status: { label: 'Kapalı', tone: 'success' },
  },
  {
    no: 'SALE-000031',
    date: '12 Nis 2026',
    type: 'sale',
    amount: '$22,420.00',
    status: { label: 'Kapalı', tone: 'success' },
  },
  {
    no: 'SALE-000025',
    date: '3 Nis 2026',
    type: 'sale',
    amount: '$5,140.00',
    status: { label: 'Kapalı', tone: 'success' },
  },
  {
    no: 'SALE-000019',
    date: '28 Mar 2026',
    type: 'sale',
    amount: '$3,890.00',
    status: { label: 'Kapalı', tone: 'success' },
  },
  {
    no: 'PAY-000018',
    date: '20 Mar 2026',
    type: 'payment',
    amount: '$5,140.00',
    status: { label: 'Kapalı', tone: 'success' },
  },
  {
    no: 'REFUND-000004',
    date: '20 Mar 2026',
    type: 'refund',
    amount: '−$1,200.00',
    status: { label: 'Kapalı', tone: 'neutral' },
  },
];

const TYPE_LABEL: Record<DocRow['type'], string> = {
  sale: 'Satış',
  payment: 'Ödeme',
  refund: 'İade',
};

export function Customer360Documents() {
  return (
    <section className="table-card">
      <div className="table-toolbar">
        <div className="left">
          <strong style={{ fontSize: 14 }}>Belgeler</strong>
          <span className="dim" style={{ fontSize: 12 }}>
            18 kayıt
          </span>
        </div>
        <div className="right">
          <button type="button" className="btn btn-secondary btn-sm">
            <Download size={14} strokeWidth={1.75} />
            CSV
          </button>
        </div>
      </div>

      <table className="data">
        <thead>
          <tr>
            <th>Belge No</th>
            <th>Tarih</th>
            <th>Tür</th>
            <th className="num">Tutar</th>
            <th>Durum</th>
            <th />
          </tr>
        </thead>
        <tbody>
          {ROWS.map((r) => (
            <tr key={r.no}>
              <td className="mono">
                <Link href={`/documents/sales-invoice/${r.no}`}>{r.no}</Link>
              </td>
              <td>{r.date}</td>
              <td>{TYPE_LABEL[r.type]}</td>
              <td className="num">{r.amount}</td>
              <td>
                <span className={`pill pill-${r.status.tone}`}>{r.status.label}</span>
              </td>
              <td>
                <button type="button" className="row-menu" aria-label="Eylemler">
                  <MoreHorizontal size={14} strokeWidth={1.75} />
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      <div className="table-footer">
        <div>1–{ROWS.length} / 18 gösteriliyor</div>
        <div className="pager">
          <span className="pg">
            <ChevronLeft size={12} strokeWidth={1.75} />
          </span>
          <span className="pg is-active">1</span>
          <span className="pg">2</span>
          <span className="pg">
            <ChevronRight size={12} strokeWidth={1.75} />
          </span>
        </div>
      </div>
    </section>
  );
}
