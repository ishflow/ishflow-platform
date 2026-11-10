'use client';

import { Link } from '@/platform/i18n/navigation';
import { AlertOctagon, Flame, Gift, MoreHorizontal } from 'lucide-react';
import { type ReactNode, useState } from 'react';
import { V2DocFilterBar } from '../_shared/doc-filter-bar';

export type StockAdjustmentReason = 'waste' | 'loss' | 'fire' | 'gift' | 'sample';

export type StockAdjustmentRow = {
  id: string;
  docNo: string;
  warehouse: string;
  date: string;
  sign: '+' | '−';
  reason: StockAdjustmentReason;
  reasonLabel: string;
  amount: string;
  status: { label: string; tone: 'success' | 'warning' | 'danger' | 'neutral' };
  detailHref: string;
};

const REASON_ICONS: Record<StockAdjustmentReason, ReactNode> = {
  waste: <AlertOctagon size={14} strokeWidth={1.75} style={{ color: 'var(--warning-text)' }} />,
  loss: <AlertOctagon size={14} strokeWidth={1.75} style={{ color: 'var(--warning-text)' }} />,
  fire: <Flame size={14} strokeWidth={1.75} style={{ color: 'var(--danger)' }} />,
  gift: <Gift size={14} strokeWidth={1.75} style={{ color: 'var(--info)' }} />,
  sample: <Gift size={14} strokeWidth={1.75} style={{ color: 'var(--text-muted)' }} />,
};

export type StockAdjustmentListProps = {
  columns: {
    no: string;
    warehouse: string;
    date: string;
    type: string;
    reason: string;
    amount: string;
    status: string;
  };
  statuses: Array<{ key: string; label: string; count: number }>;
  searchPlaceholder: string;
  filterLabel: string;
  exportLabel: string;
  newLabel: string;
  newHref: string;
  rows: StockAdjustmentRow[];
};

export function V2StockAdjustmentList(props: StockAdjustmentListProps) {
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
            <th>{props.columns.type}</th>
            <th>{props.columns.reason}</th>
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
              <td>{r.warehouse}</td>
              <td>{r.date}</td>
              <td>
                <span
                  className={`pill pill-${r.sign === '+' ? 'success' : 'danger'}`}
                  style={{ fontSize: 11 }}
                >
                  {r.sign}
                </span>
              </td>
              <td>
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                  {REASON_ICONS[r.reason]}
                  {r.reasonLabel}
                </span>
              </td>
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
