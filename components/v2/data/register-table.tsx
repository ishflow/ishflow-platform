import type { RegisterEmptyState } from '@/platform/metadata';
import { ChevronLeft, ChevronRight, Download, Filter, MoreHorizontal, Search } from 'lucide-react';
import type { ReactNode } from 'react';
import { type ChipOption, V2ChipFilterStatic } from './chip-filter';
import './data.css';

export type RegisterColumn = {
  key: string;
  label: string;
  align?: 'left' | 'right';
};

export type RegisterRowCell = ReactNode;

export type RegisterRow = {
  id: string;
  cells: RegisterRowCell[];
};

export type RegisterTableProps = {
  columns: RegisterColumn[];
  chipOptions: ChipOption[];
  searchPlaceholder: string;
  filterLabel: string;
  exportLabel: string;
  rows: RegisterRow[];
  totalsRow?: RegisterRowCell[];
  /** "1–10 / 14 shown · 25 per page" — pre-translated */
  pagerInfo?: string;
  /** Real page count (ceil(totalCount / pageSize)). Drives the page-number
   *  chips so a single-page result shows just "1" — no phantom "2". */
  pageCount?: number;
  /** Optional extra toolbar action button (e.g. "+ New") */
  extraAction?: ReactNode;
  /** Optional override: when set, replaces the default static chip row
   *  with a custom node (e.g. URL-driven `V2ChipFilterLink`). The
   *  `chipOptions` prop is still required for type compat but is
   *  ignored when this slot is provided. */
  chipFilterNode?: ReactNode;
  /** Optional override: replaces the default placeholder-only input
   *  with a custom node (e.g. URL-driven `V2RegisterSearchInput`). */
  searchInputNode?: ReactNode;
  /** Optional save-view button rendered after the export button. */
  saveViewSlot?: ReactNode;
  /** Shown in the table body when `rows` is empty (loader-supplied). */
  emptyState?: RegisterEmptyState;
};

/**
 * Generic register/movement table — variant-9 parity.
 *
 * Drives `alacaklar-hesabi`, `borclar-hesabi`, `stok-bakiyesi`, `satis`
 * mockups. Renders a chip-filter row, search + filter + export toolbar, a
 * data table, an optional totals row, and a static pager footer. All
 * filtering/searching is presentational placeholder for V0.3 — real wiring
 * lands in the integration phase.
 */
export function V2RegisterTable(props: RegisterTableProps) {
  return (
    <section className="table-card">
      <div className="table-toolbar">
        <div className="left">
          {props.chipFilterNode ?? <V2ChipFilterStatic options={props.chipOptions} />}
        </div>
        <div className="right">
          {props.searchInputNode ?? (
            <div className="search-input">
              <Search size={14} strokeWidth={1.75} />
              <input type="text" placeholder={props.searchPlaceholder} />
            </div>
          )}
          <button className="btn btn-secondary btn-sm" type="button">
            <Filter size={14} strokeWidth={1.75} />
            {props.filterLabel}
          </button>
          <button className="btn btn-secondary btn-sm" type="button">
            <Download size={14} strokeWidth={1.75} />
            {props.exportLabel}
          </button>
          {props.saveViewSlot}
          {props.extraAction}
        </div>
      </div>
      <table className="data">
        <thead>
          <tr>
            {props.columns.map((c) => (
              <th key={c.key} className={c.align === 'right' ? 'num' : undefined}>
                {c.label}
              </th>
            ))}
            <th aria-hidden />
          </tr>
        </thead>
        <tbody>
          {props.rows.length === 0 && props.emptyState ? (
            <tr>
              <td colSpan={props.columns.length + 1}>
                <div className="matrix-empty">
                  <div className="matrix-empty-title">{props.emptyState.title}</div>
                  {props.emptyState.subtitle ? (
                    <div className="matrix-empty-subtitle">{props.emptyState.subtitle}</div>
                  ) : null}
                  {props.emptyState.actions && props.emptyState.actions.length > 0 ? (
                    <div
                      style={{
                        marginTop: 12,
                        display: 'flex',
                        gap: 16,
                        justifyContent: 'center',
                      }}
                    >
                      {props.emptyState.actions.map((a) => (
                        <a key={a.href} href={a.href} className="card-link">
                          {a.label}
                        </a>
                      ))}
                    </div>
                  ) : null}
                </div>
              </td>
            </tr>
          ) : (
            props.rows.map((row) => (
              <tr key={row.id}>
                {row.cells.map((cell, i) => (
                  <td
                    key={`${row.id}-${props.columns[i]?.key ?? i}`}
                    className={props.columns[i]?.align === 'right' ? 'num' : undefined}
                  >
                    {cell}
                  </td>
                ))}
                <td>
                  <button className="row-menu" type="button" aria-label="More">
                    <MoreHorizontal size={14} strokeWidth={1.75} />
                  </button>
                </td>
              </tr>
            ))
          )}
          {props.totalsRow ? (
            <tr style={{ fontWeight: 600 }}>
              {props.totalsRow.map((cell, i) => (
                <td
                  key={`total-${props.columns[i]?.key ?? i}`}
                  className={props.columns[i]?.align === 'right' ? 'num' : undefined}
                >
                  {cell}
                </td>
              ))}
              <td />
            </tr>
          ) : null}
        </tbody>
      </table>
      {props.pagerInfo ? (
        <div className="table-footer">
          <div>{props.pagerInfo}</div>
          <div className="pager">
            <span className="pg" aria-hidden>
              <ChevronLeft size={14} strokeWidth={1.75} />
            </span>
            {Array.from(
              { length: Math.min(Math.max(props.pageCount ?? 1, 1), 7) },
              (_, i) => i + 1,
            ).map((n) => (
              <span key={n} className={`pg${n === 1 ? ' is-active' : ''}`}>
                {n}
              </span>
            ))}
            <span className="pg" aria-hidden>
              <ChevronRight size={14} strokeWidth={1.75} />
            </span>
          </div>
        </div>
      ) : null}
    </section>
  );
}
