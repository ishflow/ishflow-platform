'use client';

import { Link } from '@/platform/i18n/navigation';
import { MoreHorizontal } from 'lucide-react';
import { useState } from 'react';
import { V2DocFilterBar } from '../_shared/doc-filter-bar';

export type InventoryCountRow = {
  id: string;
  docNo: string;
  warehouse: string;
  date: string;
  diffQty: { value: string; tone: 'success' | 'danger' | 'neutral' };
  diffAmount: { value: string; tone: 'success' | 'danger' | 'neutral' };
  status: { label: string; tone: 'success' | 'warning' | 'danger' | 'neutral' };
  detailHref: string;
};

export type InventoryCountListProps = {
  columns: {
    no: string;
    warehouse: string;
    date: string;
    diffQty: string;
    diffAmount: string;
    status: string;
  };
  statuses: Array<{ key: string; label: string; count: number }>;
  searchPlaceholder: string;
  filterLabel: string;
  exportLabel: string;
  newLabel: string;
  newHref: string;
  rows: InventoryCountRow[];
};

function toneColor(tone: 'success' | 'danger' | 'neutral'): string | undefined {
  if (tone === 'success') return 'var(--success-text)';
  if (tone === 'danger') return 'var(--danger-text)';
  return undefined;
}

export function V2InventoryCountList(props: InventoryCountListProps) {
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
            <th>{props.columns.warehouse}</th>
            <th>{props.columns.date}</th>
            <th className="num">{props.columns.diffQty}</th>
            <th className="num">{props.columns.diffAmount}</th>
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
              <td>{r.warehouse}</td>
              <td>{r.date}</td>
              <td className="num" style={{ color: toneColor(r.diffQty.tone) }}>
                {r.diffQty.value}
              </td>
              <td className="num" style={{ color: toneColor(r.diffAmount.tone) }}>
                {r.diffAmount.value}
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
