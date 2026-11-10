import { ChevronDown } from 'lucide-react';
import './data.css';

export type PnLRowKind = 'section' | 'leaf' | 'subtotal' | 'total';

export type PnLRow = {
  id: string;
  label: string;
  current: string;
  previous: string;
  delta?: { value: string; tone: 'up' | 'down' };
  kind: PnLRowKind;
};

export type PnLTableProps = {
  columns: { item: string; current: string; previous: string; delta: string };
  rows: PnLRow[];
};

export function V2PnLTable({ columns, rows }: PnLTableProps) {
  return (
    <section className="table-card" style={{ padding: 0 }}>
      <table className="pl-table">
        <thead>
          <tr>
            <th style={{ width: 28 }} aria-hidden />
            <th>{columns.item}</th>
            <th className="num" style={{ width: 160 }}>
              {columns.current}
            </th>
            <th className="num" style={{ width: 160 }}>
              {columns.previous}
            </th>
            <th className="num" style={{ width: 120 }}>
              {columns.delta}
            </th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => {
            const rowClass =
              r.kind === 'section'
                ? 'row-section'
                : r.kind === 'subtotal'
                  ? 'row-subtotal'
                  : r.kind === 'total'
                    ? 'row-total'
                    : '';
            return (
              <tr key={r.id} className={rowClass || undefined}>
                <td className={r.kind === 'section' ? 'pl-expand' : undefined}>
                  {r.kind === 'section' ? <ChevronDown size={12} strokeWidth={1.75} /> : null}
                </td>
                <td className={r.kind === 'leaf' ? 'indent' : undefined}>{r.label}</td>
                <td className="num">{r.current}</td>
                <td className="num">{r.previous}</td>
                <td className="num">
                  {r.delta ? (
                    <span className={`pl-delta ${r.delta.tone}`}>{r.delta.value}</span>
                  ) : null}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </section>
  );
}
