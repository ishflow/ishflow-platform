import { MoreHorizontal, Plus, Search } from 'lucide-react';
import Link from 'next/link';

export type RoleRow = {
  id: string;
  name: string;
  description: string;
  permissions: string;
  members: number;
  type: 'system' | 'custom';
};

export type RolesListProps = {
  labels: {
    chipAll: string;
    chipSystem: string;
    chipCustom: string;
    searchPh: string;
    newRole: string;
    columns: {
      name: string;
      description: string;
      permissions: string;
      members: string;
      type: string;
    };
    typeSystem: string;
    typeCustom: string;
    pageInfo: string;
  };
  counts: { all: number; system: number; custom: number };
  rows: RoleRow[];
  newHref: string;
  detailHref: (id: string) => string;
};

export function V2RolesList(p: RolesListProps) {
  return (
    <section className="table-card">
      <div className="table-toolbar">
        <div className="left">
          <div className="chip-row">
            <button type="button" className="chip is-active">
              {p.labels.chipAll} <span className="count">{p.counts.all}</span>
            </button>
            <button type="button" className="chip">
              {p.labels.chipSystem} <span className="count">{p.counts.system}</span>
            </button>
            <button type="button" className="chip">
              {p.labels.chipCustom} <span className="count">{p.counts.custom}</span>
            </button>
          </div>
        </div>
        <div className="right">
          <div className="search-input">
            <Search size={14} strokeWidth={1.75} />
            <input type="text" placeholder={p.labels.searchPh} />
          </div>
          <Link href={p.newHref} className="btn btn-primary btn-sm">
            <Plus size={14} strokeWidth={1.75} />
            {p.labels.newRole}
          </Link>
        </div>
      </div>

      <table className="data">
        <thead>
          <tr>
            <th>{p.labels.columns.name}</th>
            <th>{p.labels.columns.description}</th>
            <th className="num">{p.labels.columns.permissions}</th>
            <th className="num">{p.labels.columns.members}</th>
            <th>{p.labels.columns.type}</th>
            <th />
          </tr>
        </thead>
        <tbody>
          {p.rows.map((r) => (
            <tr key={r.id}>
              <td>
                <Link
                  href={p.detailHref(r.id)}
                  style={{ color: 'var(--text)', textDecoration: 'none', fontWeight: 600 }}
                >
                  {r.name}
                </Link>
              </td>
              <td className="dim">{r.description}</td>
              <td className="num">{r.permissions}</td>
              <td className="num">{r.members}</td>
              <td>
                <span className={`pill pill-${r.type === 'system' ? 'info' : 'neutral'}`}>
                  {r.type === 'system' ? p.labels.typeSystem : p.labels.typeCustom}
                </span>
              </td>
              <td>
                <button type="button" className="row-menu" aria-label="More">
                  <MoreHorizontal size={14} strokeWidth={1.75} />
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      <div className="table-footer">
        <div>{p.labels.pageInfo}</div>
        <div className="pager">
          <span className="pg is-active">1</span>
        </div>
      </div>
    </section>
  );
}
