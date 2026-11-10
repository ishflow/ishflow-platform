'use client';

import { useState } from 'react';
import { V2InvoiceFilterBar } from './invoice-filter-bar';
import { type InvoiceRowProps, V2InvoiceRow } from './invoice-row';

export type InvoiceListProps = {
  columns: {
    no: string;
    status: string;
    date: string;
    partner: string;
    warehouse: string;
    priceType: string;
    amount: string;
  };
  statuses: Array<{ key: string; label: string; count: number }>;
  searchPlaceholder: string;
  filterLabel: string;
  exportLabel: string;
  newLabel: string;
  newHref: string;
  invoices: InvoiceRowProps[];
};

export function V2InvoiceList(props: InvoiceListProps) {
  const [activeStatus, setActiveStatus] = useState('all');
  const filtered =
    activeStatus === 'all'
      ? props.invoices
      : props.invoices.filter((i) => i.status.tone === activeStatus);

  return (
    <section className="table-card">
      <V2InvoiceFilterBar
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
            <th>{props.columns.partner}</th>
            <th>{props.columns.warehouse}</th>
            <th>{props.columns.priceType}</th>
            <th className="num">{props.columns.amount}</th>
            <th />
          </tr>
        </thead>
        <tbody>
          {filtered.map((inv) => (
            <V2InvoiceRow key={inv.id} {...inv} />
          ))}
        </tbody>
      </table>
    </section>
  );
}
