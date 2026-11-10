'use client';

import { Link } from '@/platform/i18n/navigation';
import { MoreHorizontal } from 'lucide-react';
import { useState } from 'react';
import { V2DocFilterBar } from '../_shared/doc-filter-bar';

export type WarehouseRow = {
  id: string;
  code: string;
  name: string;
  subtitle?: string;
  address: string;
  activeSku: number;
  stockValue: string;
  status: { label: string; tone: 'success' | 'warning' | 'danger' | 'neutral' };
  detailHref: string;
};

export type WarehouseListProps = {
  columns: {
    code: string;
    name: string;
    address: string;
    activeSku: string;
    stockValue: string;
    status: string;
  };
  statuses: Array<{ key: string; label: string; count: number }>;
  searchPlaceholder: string;
  filterLabel: string;
  exportLabel: string;
  newLabel: string;
  newHref: string;
  rows: WarehouseRow[];
};

export function V2WarehouseList(props: WarehouseListProps) {
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
            <th>{props.columns.code}</th>
            <th>{props.columns.name}</th>
            <th>{props.columns.address}</th>
            <th className="num">{props.columns.activeSku}</th>
            <th className="num">{props.columns.stockValue}</th>
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
                  {r.code}
                </Link>
              </td>
              <td>
                <div className="row-title">{r.name}</div>
                {r.subtitle ? <div className="row-sub">{r.subtitle}</div> : null}
              </td>
              <td>{r.address}</td>
              <td className="num">{r.activeSku}</td>
              <td className="num">{r.stockValue}</td>
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
