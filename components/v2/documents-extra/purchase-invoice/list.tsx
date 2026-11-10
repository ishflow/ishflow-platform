'use client';

import type { ResolvedRowAction } from '@/platform/engine/resolve-row-actions';
import { Link } from '@/platform/i18n/navigation';
import { HandCoins, MoreHorizontal } from 'lucide-react';
import type { ComponentType } from 'react';
import { useState } from 'react';
import { V2DocFilterBar } from '../_shared/doc-filter-bar';

const ROW_ACTION_ICONS: Record<string, ComponentType<{ size?: number; strokeWidth?: number }>> = {
  HandCoins,
};

export type PurchaseInvoiceRow = {
  id: string;
  docNo: string;
  date: string;
  supplierName: string;
  warehouse?: string;
  amount: string;
  status: { label: string; tone: 'success' | 'warning' | 'danger' | 'neutral' };
  detailHref: string;
  rowActions?: ResolvedRowAction[];
};

export type PurchaseInvoiceListProps = {
  columns: {
    no: string;
    status: string;
    date: string;
    supplier: string;
    warehouse: string;
    amount: string;
  };
  statuses: Array<{ key: string; label: string; count: number }>;
  searchPlaceholder: string;
  filterLabel: string;
  exportLabel: string;
  newLabel: string;
  newHref: string;
  rows: PurchaseInvoiceRow[];
};

export function V2PurchaseInvoiceList(props: PurchaseInvoiceListProps) {
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
            <th>{props.columns.supplier}</th>
            <th>{props.columns.warehouse}</th>
            <th className="num">{props.columns.amount}</th>
            <th />
          </tr>
        </thead>
        <tbody>
          {filtered.map((r) => (
            <tr key={r.id} data-status={r.status.tone}>
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
              <td>{r.supplierName}</td>
              <td>{r.warehouse ?? '—'}</td>
              <td className="num">{r.amount}</td>
              <td>
                <div className="row-actions">
                  {(r.rowActions ?? []).map((action) => {
                    const Icon = action.icon
                      ? (ROW_ACTION_ICONS[action.icon] ?? HandCoins)
                      : HandCoins;
                    return (
                      <Link
                        key={action.key}
                        href={action.href}
                        className="row-pay-action"
                        title={action.label}
                      >
                        <Icon size={13} strokeWidth={2} />
                        <span>{action.label}</span>
                      </Link>
                    );
                  })}
                  <button className="row-menu" type="button" aria-label="More">
                    <MoreHorizontal size={14} strokeWidth={1.75} />
                  </button>
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </section>
  );
}
