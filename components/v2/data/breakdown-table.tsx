'use client';

import { type ReactNode, useState } from 'react';
import { type ChipOption, V2ChipFilterStatic } from './chip-filter';
import './data.css';

export type BreakdownColumn = {
  key: string;
  label: string;
  align?: 'left' | 'right';
};

export type BreakdownRow = {
  id: string;
  cells: ReactNode[];
};

export type BreakdownTableProps = {
  title: string;
  dimensions: ChipOption[];
  columns: BreakdownColumn[];
  rows: BreakdownRow[];
  totalsRow?: ReactNode[];
  /** Rows shown before "show more" (also the increment). Default 50. */
  pageSize?: number;
  /** "Show more" button label; omit to render every row at once. */
  moreLabel?: string;
};

const DEFAULT_PAGE_SIZE = 50;

/**
 * Breakdown table — variant-9 parity.
 *
 * Used by gross-profit + ciro-* reports: a small chip row for dimension
 * switching plus a data table with right-aligned numerical columns and an
 * optional totals footer. With large datasets the table reveals `pageSize`
 * rows at a time behind a "show more" button instead of dumping hundreds of
 * rows into an endless scroll. The totals row always reflects the full set.
 */
export function V2BreakdownTable(props: BreakdownTableProps) {
  const pageSize = props.pageSize ?? DEFAULT_PAGE_SIZE;
  const total = props.rows.length;
  const [visible, setVisible] = useState(pageSize);
  // Paging is only active when a label is supplied and there's an overflow.
  const paged = props.moreLabel != null && total > pageSize;
  const shown = paged ? Math.min(visible, total) : total;
  const visibleRows = paged ? props.rows.slice(0, shown) : props.rows;

  return (
    <section className="table-card">
      <div className="table-toolbar">
        <div className="left">
          <strong style={{ fontSize: 14 }}>{props.title}</strong>
        </div>
        <div className="right">
          <V2ChipFilterStatic options={props.dimensions} />
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
          </tr>
        </thead>
        <tbody>
          {visibleRows.map((row) => (
            <tr key={row.id}>
              {row.cells.map((cell, i) => (
                <td
                  key={`${row.id}-${props.columns[i]?.key ?? i}`}
                  className={props.columns[i]?.align === 'right' ? 'num' : undefined}
                >
                  {cell}
                </td>
              ))}
            </tr>
          ))}
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
            </tr>
          ) : null}
        </tbody>
      </table>
      {paged && shown < total ? (
        <div className="table-loadmore">
          <span className="dim">
            {shown} / {total}
          </span>
          <button
            type="button"
            className="btn btn-ghost"
            onClick={() => setVisible((v) => v + pageSize)}
          >
            {props.moreLabel}
          </button>
        </div>
      ) : null}
    </section>
  );
}
