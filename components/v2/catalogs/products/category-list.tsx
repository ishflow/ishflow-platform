import { Link } from '@/platform/i18n/navigation';
import { ChevronLeft, ChevronRight, Download, MoreHorizontal, Plus, Search } from 'lucide-react';

export type CategoryListRow = {
  id: string;
  name: string;
  count: number;
  createdAt: string;
};

export type CategoryListProps = {
  rows: CategoryListRow[];
  i18n: {
    all: string;
    searchPlaceholder: string;
    searchAria: string;
    export: string;
    newCategory: string;
    actions: string;
    col: { name: string; productCount: string; createdAt: string };
    footer: (shown: number, total: number) => string;
  };
};

export function CategoryList({ rows, i18n }: CategoryListProps) {
  return (
    <section className="table-card">
      <div className="table-toolbar">
        <div className="left">
          <div className="chip-row">
            <button type="button" className="chip is-active">
              {i18n.all} <span className="count">{rows.length}</span>
            </button>
          </div>
        </div>
        <div className="right">
          <div className="search-input">
            <Search size={14} strokeWidth={1.75} />
            <input type="text" placeholder={i18n.searchPlaceholder} aria-label={i18n.searchAria} />
          </div>
          <button type="button" className="btn btn-secondary btn-sm">
            <Download size={14} strokeWidth={1.75} />
            {i18n.export}
          </button>
          <Link href="/catalogs/products/categories/new" className="btn btn-primary btn-sm">
            <Plus size={14} strokeWidth={1.75} />
            {i18n.newCategory}
          </Link>
        </div>
      </div>

      <table className="data">
        <thead>
          <tr>
            <th style={{ width: 36 }}>
              <span className="checkbox" />
            </th>
            <th className="sortable">{i18n.col.name}</th>
            <th className="num">{i18n.col.productCount}</th>
            <th>{i18n.col.createdAt}</th>
            <th />
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => (
            <tr key={r.id}>
              <td>
                <span className="checkbox" />
              </td>
              <td>
                <Link
                  href={`/catalogs/products/categories/${r.id}`}
                  style={{ color: 'var(--text)', fontWeight: 600 }}
                >
                  {r.name}
                </Link>
              </td>
              <td className="num">{r.count}</td>
              <td className="dim">{r.createdAt}</td>
              <td>
                <button type="button" className="row-menu" aria-label={i18n.actions}>
                  <MoreHorizontal size={14} strokeWidth={1.75} />
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      <div className="table-footer">
        <div>{i18n.footer(rows.length, rows.length)}</div>
        <div className="pager">
          <span className="pg">
            <ChevronLeft size={12} strokeWidth={1.75} />
          </span>
          <span className="pg is-active">1</span>
          <span className="pg">
            <ChevronRight size={12} strokeWidth={1.75} />
          </span>
        </div>
      </div>
    </section>
  );
}
