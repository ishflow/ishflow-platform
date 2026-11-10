'use client';

import { Link } from '@/platform/i18n/navigation';
import { ExternalLink, MoreHorizontal } from 'lucide-react';
import { useState } from 'react';
import { V2DocFilterBar } from '../_shared/doc-filter-bar';

export type ReturnInvoiceRow = {
  id: string;
  docNo: string;
  originalDocNo: string;
  customer: string;
  date: string;
  amount: string;
  status: { label: string; tone: 'success' | 'warning' | 'danger' | 'neutral' };
  detailHref: string;
};

export type ReturnInvoiceListProps = {
  columns: {
    no: string;
    original: string;
    customer: string;
    date: string;
    amount: string;
    status: string;
  };
  statuses: Array<{ key: string; label: string; count: number }>;
  searchPlaceholder: string;
  filterLabel: string;
  exportLabel: string;
  newLabel: string;
  newHref: string;
  rows: ReturnInvoiceRow[];
};

export function V2ReturnInvoiceList(props: ReturnInvoiceListProps) {
  const [activeStatus, setActiveStatus] = useState('all');
  const filtered =
    activeStatus === 'all' ? props.rows : props.rows.filter((r) => r.status.tone === activeStatus);

  return (
    <section className="table-card">
      <V2DocFilterBar
        statuses={props.statuses}
        activeStatus={activeStatus}
        onStatusChange={setActiveStatus}
        searchPlaceholder={props.searchPlaceholder}
        filterLabel={props.filterLabel}
        exportLabel={props.exportLabel}
        newLabel={props.newLabel}
        newHref={props.newHref}
      />
      <table className="data">
        <thead>
          <tr>
            <th style={{ width: 36 }}>
              <span className="checkbox" />
            </th>
            <th>{props.columns.no}</th>
            <th>{props.columns.original}</th>
            <th>{props.columns.customer}</th>
            <th>{props.columns.date}</th>
            <th className="num">{props.columns.amount}</th>
            <th>{props.columns.status}</th>
            <th />
          </tr>
        </thead>
        <tbody>
          {filtered.map((r) => (
            <tr key={r.id}>
              <td>
                <span className="checkbox" />
              </td>
              <td className="mono">
                <Link href={r.detailHref} style={{ color: 'inherit' }}>
                  {r.docNo}
                </Link>
              </td>
              <td className="mono">
                <span
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: 4,
                    color: 'var(--accent)',
                  }}
                >
                  {r.originalDocNo}
                  <ExternalLink size={12} strokeWidth={1.75} />
                </span>
              </td>
              <td>{r.customer}</td>
              <td>{r.date}</td>
              <td className="num" style={{ color: 'var(--danger-text)' }}>
                {r.amount}
              </td>
              <td>
                <span className={`pill pill-${r.status.tone}`}>{r.status.label}</span>
              </td>
              <td>
                <button className="row-menu" type="button" aria-label="More">
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
