import { V2ExportCsvButton } from '@/components/v2/data/export-csv-button';
import { MoreHorizontal } from 'lucide-react';

export type RecentInvoiceStatusTone = 'success' | 'warning' | 'danger' | 'neutral';

export type RecentInvoiceItem = {
  id: string;
  docNo: string;
  partnerName: string;
  amount: string;
  status: { label: string; tone: RecentInvoiceStatusTone };
  date: string;
};

export type RecentInvoicesProps = {
  title: string;
  exportLabel: string;
  moreLabel: string;
  columns: { no: string; partner: string; amount: string; status: string; date: string };
  invoices: RecentInvoiceItem[];
};

/**
 * Dashboard "recent invoices" preview. Read-only preview of the most recent
 * invoices — live search + status filters live on the full invoices list
 * (reachable from the sidebar), so the only toolbar affordance here is a working
 * CSV export of the visible rows. (Removed previously-decorative search + filter.)
 */
export function V2RecentInvoices({
  title,
  exportLabel,
  moreLabel,
  columns,
  invoices,
}: RecentInvoicesProps) {
  return (
    <section className="table-card">
      <div className="table-toolbar">
        <div className="left">
          <strong style={{ fontSize: 14 }}>{title}</strong>
        </div>
        <div className="right">
          <V2ExportCsvButton label={exportLabel} filenameStem="recent-invoices" />
        </div>
      </div>
      <table className="data">
        <thead>
          <tr>
            <th>{columns.no}</th>
            <th>{columns.partner}</th>
            <th className="num">{columns.amount}</th>
            <th>{columns.status}</th>
            <th>{columns.date}</th>
            <th />
          </tr>
        </thead>
        <tbody>
          {invoices.map((inv) => (
            <tr key={inv.id}>
              <td className="mono">{inv.docNo}</td>
              <td>{inv.partnerName}</td>
              <td className="num">{inv.amount}</td>
              <td>
                <span className={`pill pill-${inv.status.tone}`}>{inv.status.label}</span>
              </td>
              <td>{inv.date}</td>
              <td>
                <button className="row-menu" type="button" aria-label={moreLabel}>
                  <MoreHorizontal size={14} strokeWidth={1.75} />
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </section>
  );
}
