import type {
  RegisterMatrixCell,
  RegisterMatrixColumnHeader,
  RegisterMatrixPayload,
} from '@/platform/metadata';
import type { ReactNode } from 'react';

export type RegisterMatrixProps = {
  payload: RegisterMatrixPayload;
  /** Column codes the user wants visible. Locked codes are always
   *  rendered regardless of this set. */
  visibleCodes: string[];
  /** Toolbar left slot — typically title + meta tags (register key, mode). */
  toolbarLeft?: ReactNode;
  /** Toolbar right slot — search + filter + export + "+ Yeni" etc. */
  toolbarRight?: ReactNode;
  /** Column-bar slot — rendered between toolbar and table (V4 inline picker). */
  columnBar?: ReactNode;
  /** Footer text e.g. "9 / 328 ürün · 7 fiyat türü". */
  footer?: ReactNode;
  i18n: {
    productColumnLabel: string;
    emptyTitle: string;
    emptySubtitle: string;
  };
};

/**
 * Matrix-mode register table — rows × columns grid.
 *
 * Used when a register-view loader returns a `matrix` payload (e.g.
 * Product Prices). First column (rows[].title) is sticky on horizontal
 * scroll so the user keeps the row identifier in view while scanning
 * across many price types.
 *
 * Pure server component — no client state. Column visibility comes from
 * URL `?cols=` (resolved by the caller into `visibleCodes`).
 */
export function V2RegisterMatrix(props: RegisterMatrixProps) {
  const { payload, visibleCodes, toolbarLeft, toolbarRight, columnBar, footer, i18n } = props;

  const visible = new Set(visibleCodes);
  const visibleColumns: RegisterMatrixColumnHeader[] = payload.columns.filter(
    (c) => c.locked || visible.has(c.code),
  );
  const visibleIdxs = payload.columns
    .map((c, i) => ({ code: c.code, locked: c.locked, idx: i }))
    .filter((c) => c.locked || visible.has(c.code))
    .map((c) => c.idx);

  if (payload.rows.length === 0) {
    return (
      <section className="table-card">
        <div className="table-toolbar">
          <div className="left">{toolbarLeft}</div>
          <div className="right">{toolbarRight}</div>
        </div>
        {columnBar}
        <div className="matrix-empty">
          <div className="matrix-empty-title">{i18n.emptyTitle}</div>
          <div className="matrix-empty-subtitle">{i18n.emptySubtitle}</div>
        </div>
      </section>
    );
  }

  return (
    <section className="table-card">
      <div className="table-toolbar">
        <div className="left">{toolbarLeft}</div>
        <div className="right">{toolbarRight}</div>
      </div>
      {columnBar}
      <div className="matrix-wrap">
        <table className="matrix-table">
          <thead>
            <tr>
              <th className="col-product">{i18n.productColumnLabel}</th>
              {visibleColumns.map((c) => (
                <th key={c.id} className="num">
                  {c.title}
                  {c.subtitle ? <span className="kind-tag">{c.subtitle}</span> : null}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {payload.rows.map((row, rowIdx) => (
              <tr key={row.id}>
                <td className="col-product">
                  <div className="row-title">{row.title}</div>
                  {row.subtitle ? <div className="row-sub">{row.subtitle}</div> : null}
                </td>
                {visibleIdxs.map((colIdx) => {
                  const column = payload.columns[colIdx];
                  if (!column) return null;
                  return (
                    <MatrixCellView
                      key={`${row.id}-${column.id}`}
                      cell={payload.cells[rowIdx]?.[colIdx]}
                    />
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {footer ? <div className="table-footer">{footer}</div> : null}
    </section>
  );
}

function MatrixCellView({ cell }: { cell?: RegisterMatrixCell }) {
  if (!cell || cell.formatted === null) {
    return <td className="matrix-cell dim">—</td>;
  }
  if (cell.tag === 'zero') {
    return (
      <td className="matrix-cell">
        <span className="pill pill-danger">{cell.formatted}</span>
      </td>
    );
  }
  if (cell.tag === 'low') {
    return (
      <td className="matrix-cell">
        <span className="pill pill-warning">{cell.formatted}</span>
      </td>
    );
  }
  return (
    <td className="matrix-cell">
      <span className="price">{cell.formatted}</span>
      {cell.tag === 'cost' ? <div className="l2 l2-cost">cost</div> : null}
      {cell.tag === 'l2' ? <div className="l2">L2</div> : null}
    </td>
  );
}
