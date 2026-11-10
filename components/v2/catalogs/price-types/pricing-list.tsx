import { Link } from '@/platform/i18n/navigation';
import {
  ChevronLeft,
  ChevronRight,
  Download,
  Filter,
  MoreHorizontal,
  Plus,
  Search,
} from 'lucide-react';

export type PricingListRow = {
  id: string;
  no: string;
  status: 'posted' | 'saved';
  date: string;
  priceType: string;
  count: number;
};

export type PricingListProps = {
  rows: PricingListRow[];
  counts: { all: number; posted: number; saved: number };
  i18n: {
    chip: { all: string; posted: string; saved: string };
    searchPlaceholder: string;
    searchAria: string;
    filter: string;
    export: string;
    newSetting: string;
    actions: string;
    statusPosted: string;
    statusSaved: string;
    col: { no: string; status: string; date: string; priceType: string; count: string };
    footer: (shown: number, total: number) => string;
  };
};

export function PricingList({ rows, counts, i18n }: PricingListProps) {
  return (
    <section className="table-card">
      <div className="table-toolbar">
        <div className="left">
          <div className="chip-row">
            <button type="button" className="chip is-active">
              {i18n.chip.all} <span className="count">{counts.all}</span>
            </button>
            <button type="button" className="chip">
              {i18n.chip.posted} <span className="count">{counts.posted}</span>
            </button>
            <button type="button" className="chip">
              {i18n.chip.saved} <span className="count">{counts.saved}</span>
            </button>
          </div>
        </div>
        <div className="right">
          <div className="search-input">
            <Search size={14} strokeWidth={1.75} />
            <input type="text" placeholder={i18n.searchPlaceholder} aria-label={i18n.searchAria} />
          </div>
          <button type="button" className="btn btn-secondary btn-sm">
            <Filter size={14} strokeWidth={1.75} />
            {i18n.filter}
          </button>
          <button type="button" className="btn btn-secondary btn-sm">
            <Download size={14} strokeWidth={1.75} />
            {i18n.export}
          </button>
          <Link href="/catalogs/price-types/pricing/new" className="btn btn-primary btn-sm">
            <Plus size={14} strokeWidth={1.75} />
            {i18n.newSetting}
          </Link>
        </div>
      </div>

      <table className="data">
        <thead>
          <tr>
            <th style={{ width: 36 }}>
              <span className="checkbox" />
            </th>
            <th className="sortable">{i18n.col.no}</th>
            <th>{i18n.col.status}</th>
            <th className="sortable">{i18n.col.date}</th>
            <th className="sortable">{i18n.col.priceType}</th>
            <th className="num">{i18n.col.count}</th>
            <th />
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => (
            <tr key={r.id}>
              <td>
                <span className="checkbox" />
              </td>
              <td className="mono">
                <Link href={`/catalogs/price-types/pricing/${r.id}`} style={{ color: 'inherit' }}>
                  {r.no}
                </Link>
              </td>
              <td>
                <span className={`pill pill-${r.status === 'posted' ? 'success' : 'warning'}`}>
                  {r.status === 'posted' ? i18n.statusPosted : i18n.statusSaved}
                </span>
              </td>
              <td>{r.date}</td>
              <td>{r.priceType}</td>
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

      <div className="table-footer">
        <div>{i18n.footer(rows.length, counts.all)}</div>
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
