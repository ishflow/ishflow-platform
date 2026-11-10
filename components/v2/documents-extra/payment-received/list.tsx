'use client';

import { Link } from '@/platform/i18n/navigation';
import { MoreHorizontal } from 'lucide-react';
import { useState } from 'react';
import { V2DocFilterBar } from '../_shared/doc-filter-bar';

export type PaymentReceivedRow = {
  id: string;
  docNo: string;
  date: string;
  customer: string;
  amount: string;
  method: { label: string; tone: 'info' | 'neutral' };
  relatedInvoice: string;
  status: { label: string; tone: 'success' | 'warning' | 'danger' | 'neutral' };
  detailHref: string;
};

export type PaymentReceivedListProps = {
  columns: {
    no: string;
    status: string;
    date: string;
    customer: string;
    amount: string;
    method: string;
    related: string;
  };
  statuses: Array<{ key: string; label: string; count: number }>;
  searchPlaceholder: string;
  filterLabel: string;
  exportLabel: string;
  newLabel: string;
  newHref: string;
  rows: PaymentReceivedRow[];
};

export function V2PaymentReceivedList(props: PaymentReceivedListProps) {
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
            <th>{props.columns.status}</th>
            <th>{props.columns.date}</th>
            <th>{props.columns.customer}</th>
            <th className="num">{props.columns.amount}</th>
            <th>{props.columns.method}</th>
            <th>{props.columns.related}</th>
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
              <td>
                <span className={`pill pill-${r.status.tone}`}>{r.status.label}</span>
              </td>
              <td>{r.date}</td>
              <td>{r.customer}</td>
              <td className="num">{r.amount}</td>
              <td>
                <span className={`pill pill-${r.method.tone}`}>{r.method.label}</span>
              </td>
              <td className="mono dim">{r.relatedInvoice}</td>
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
