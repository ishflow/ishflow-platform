'use client';

import { Link } from '@/platform/i18n/navigation';
import { Download, Filter, Plus, Search } from 'lucide-react';
import { useMemo, useState } from 'react';

/**
 * Client-side row for the generic V2 document list. Strings are
 * pre-formatted on the server (date, amount) so this stays a thin
 * filter/render shell — no Intl on the client.
 */
export type GenericRow = {
  id: string;
  number: string;
  /** ISO string — only used for sort key parity, display uses `dateFormatted`. */
  date: string;
  dateFormatted: string;
  /** Engine status: SAVED | POSTED | FAILED. */
  status: string;
  /** Pre-resolved partner label (or short uuid fallback / '—'). */
  partnerName: string;
  /** Pre-formatted amount string ('$1,234.56' / '—'). */
  amount: string;
};

export type GenericListLabels = {
  colNo: string;
  colDate: string;
  colStatus: string;
  colPartner: string;
  colAmount: string;
  statusAll: string;
  statusPosted: string;
  statusSaved: string;
  statusFailed: string;
  searchPh: string;
  filterLabel: string;
  exportLabel: string;
  newLabel: string;
  emptyState: string;
};

type ChipKey = 'all' | 'POSTED' | 'SAVED' | 'FAILED';

/**
 * Generic V2 document list table. Reuses the same CSS class vocabulary
 * (`table-card`, `table-toolbar`, `chip-row`, `chip`, `pill pill-*`,
 * `data`, `mono`, `num`) as the bespoke sales-invoice list so the visual
 * style matches without copying styles.
 */
export function GenericDocumentListTable({
  slug,
  newHref,
  rows,
  counts,
  labels,
}: {
  slug: string;
  /** When omitted, the "New" button is hidden — used to gate document
   *  creation for users without write permission. */
  newHref?: string;
  rows: GenericRow[];
  counts: { all: number; posted: number; saved: number; failed: number };
  labels: GenericListLabels;
}) {
  const [activeStatus, setActiveStatus] = useState<ChipKey>('all');
  const [query, setQuery] = useState('');

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return rows.filter((r) => {
      if (activeStatus !== 'all' && r.status !== activeStatus) return false;
      if (q && !r.number.toLowerCase().includes(q) && !r.partnerName.toLowerCase().includes(q))
        return false;
      return true;
    });
  }, [rows, activeStatus, query]);

  const chips: Array<{ key: ChipKey; label: string; count: number }> = [
    { key: 'all', label: labels.statusAll, count: counts.all },
    { key: 'POSTED', label: labels.statusPosted, count: counts.posted },
    { key: 'SAVED', label: labels.statusSaved, count: counts.saved },
    { key: 'FAILED', label: labels.statusFailed, count: counts.failed },
  ];

  const tone = (s: string): 'success' | 'warning' | 'danger' | 'neutral' =>
    s === 'POSTED' ? 'success' : s === 'FAILED' ? 'danger' : 'warning';
  const statusLabel = (s: string) =>
    s === 'POSTED'
      ? labels.statusPosted
      : s === 'FAILED'
        ? labels.statusFailed
        : labels.statusSaved;

  return (
    <section className="table-card">
      <div className="table-toolbar">
        <div className="left">
          <div className="chip-row">
            {chips.map((c) => (
              <button
                key={c.key}
                type="button"
                className={`chip${c.key === activeStatus ? ' is-active' : ''}`}
                onClick={() => setActiveStatus(c.key)}
              >
                {c.label} <span className="count">{c.count}</span>
              </button>
            ))}
          </div>
        </div>
        <div className="right">
          <div className="search-input">
            <Search size={14} strokeWidth={1.75} />
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder={labels.searchPh}
            />
          </div>
          <button type="button" className="btn btn-secondary btn-sm">
            <Filter size={14} strokeWidth={1.75} />
            {labels.filterLabel}
          </button>
          <button type="button" className="btn btn-secondary btn-sm">
            <Download size={14} strokeWidth={1.75} />
            {labels.exportLabel}
          </button>
          {newHref ? (
            <Link href={newHref} className="btn btn-primary btn-sm">
              <Plus size={14} strokeWidth={1.75} />
              {labels.newLabel}
            </Link>
          ) : null}
        </div>
      </div>

      {filtered.length === 0 ? (
        <div className="empty-state" style={{ padding: '48px 24px', textAlign: 'center' }}>
          {labels.emptyState}
        </div>
      ) : (
        <table className="data">
          <thead>
            <tr>
              <th style={{ width: 36 }}>
                <span className="checkbox" />
              </th>
              <th>{labels.colNo}</th>
              <th>{labels.colStatus}</th>
              <th>{labels.colDate}</th>
              <th>{labels.colPartner}</th>
              <th className="num">{labels.colAmount}</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((r) => (
              <tr key={r.id} data-status={tone(r.status)}>
                <td>
                  <span className="checkbox" />
                </td>
                <td className="mono">
                  <Link href={`/documents/${slug}/${r.id}`} style={{ color: 'inherit' }}>
                    {r.number}
                  </Link>
                </td>
                <td>
                  <span className={`pill pill-${tone(r.status)}`}>{statusLabel(r.status)}</span>
                </td>
                <td>{r.dateFormatted}</td>
                <td>{r.partnerName}</td>
                <td className="num">{r.amount}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </section>
  );
}
