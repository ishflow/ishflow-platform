'use client';

import { Link } from '@/platform/i18n/navigation';
import { ArrowRight, MoreHorizontal } from 'lucide-react';
import { useState } from 'react';
import { V2DocFilterBar } from '../_shared/doc-filter-bar';

export type StockTransferRow = {
  id: string;
  docNo: string;
  fromWarehouse: string;
  toWarehouse: string;
  date: string;
  shipmentNo: string;
  totalUnits: number;
  status: { label: string; tone: 'success' | 'warning' | 'danger' | 'neutral' };
  detailHref: string;
};

export type StockTransferListProps = {
  columns: {
    no: string;
    route: string;
    date: string;
    shipment: string;
    units: string;
    status: string;
  };
  statuses: Array<{ key: string; label: string; count: number }>;
  searchPlaceholder: string;
  filterLabel: string;
  exportLabel: string;
  newLabel: string;
  newHref: string;
  rows: StockTransferRow[];
};

export function V2StockTransferList(props: StockTransferListProps) {
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
            <th>{props.columns.route}</th>
            <th>{props.columns.date}</th>
            <th>{props.columns.shipment}</th>
            <th className="num">{props.columns.units}</th>
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
              <td>
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                  {r.fromWarehouse}
                  <ArrowRight size={12} strokeWidth={1.75} style={{ color: 'var(--text-dim)' }} />
                  {r.toWarehouse}
                </span>
              </td>
              <td>{r.date}</td>
              <td className="mono dim">{r.shipmentNo}</td>
              <td className="num">{r.totalUnits}</td>
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
