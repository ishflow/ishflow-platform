import { Link } from '@/platform/i18n/navigation';
import { Download, MoreHorizontal, Plus, Search } from 'lucide-react';

export type GroupListRow = {
  id: string;
  name: string;
  count: number;
};

export type GroupListProps = {
  rows: GroupListRow[];
  i18n: {
    allHeader: string;
    countSuffix: (n: number) => string;
    searchPlaceholder: string;
    searchAria: string;
    export: string;
    newGroup: string;
    actions: string;
    col: { name: string; productCount: string };
  };
};

export function GroupList({ rows, i18n }: GroupListProps) {
  return (
    <section className="table-card">
      <div className="table-toolbar">
        <div className="left">
          <strong style={{ fontSize: 14 }}>{i18n.allHeader}</strong>
          <span className="dim" style={{ fontSize: 12 }}>
            {i18n.countSuffix(rows.length)}
          </span>
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
          <Link href="/catalogs/products/groups/new" className="btn btn-primary btn-sm">
            <Plus size={14} strokeWidth={1.75} />
            {i18n.newGroup}
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
                  href={`/catalogs/products/groups/${r.id}`}
                  style={{ color: 'var(--text)', fontWeight: 600 }}
                >
                  {r.name}
                </Link>
              </td>
              <td className="num">{r.count}</td>
              <td>
                <button type="button" className="row-menu" aria-label={i18n.actions}>
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
