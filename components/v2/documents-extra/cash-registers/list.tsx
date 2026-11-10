'use client';

import { Link } from '@/platform/i18n/navigation';
import { MoreHorizontal } from 'lucide-react';
import { useState } from 'react';
import { V2DocFilterBar } from '../_shared/doc-filter-bar';

export type CashRegisterRow = {
  id: string;
  code: string;
  name: string;
  note?: string;
  balance: string;
  balanceTone: 'success' | 'warning' | 'danger' | 'neutral';
  status: { label: string; tone: 'success' | 'warning' | 'danger' | 'neutral' };
  detailHref: string;
};

export type CashRegisterListProps = {
  columns: {
    code: string;
    name: string;
    note: string;
    balance: string;
    status: string;
  };
  statuses: Array<{ key: string; label: string; count: number }>;
  searchPlaceholder: string;
  filterLabel: string;
  exportLabel: string;
  newLabel: string;
  newHref: string;
  rows: CashRegisterRow[];
};

export function V2CashRegisterList(props: CashRegisterListProps) {
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
            <th>{props.columns.note}</th>
            <th className="num">{props.columns.balance}</th>
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
              </td>
              <td>{r.note ?? '—'}</td>
              <td className={`num pill-${r.balanceTone}`}>{r.balance}</td>
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
