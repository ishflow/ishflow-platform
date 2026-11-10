'use client';

import { exportNearestTable } from '@/lib/v2-shell/csv-export';
import { Link, useRouter } from '@/platform/i18n/navigation';
import {
  Check,
  ChevronLeft,
  ChevronRight,
  Download,
  Edit,
  Lock,
  MoreHorizontal,
  Plus,
  RefreshCw,
  Search,
  UserPlus,
  X,
} from 'lucide-react';
import { useEffect, useState, useTransition } from 'react';

export type AuditAction =
  | 'update'
  | 'create'
  | 'post'
  | 'login'
  | 'delete'
  | 'settings'
  | 'webhook'
  | 'cron'
  | 'invite'
  | 'post_fail';

export type AuditType = 'all' | 'doc' | 'user' | 'system' | 'setting';

export type AuditRow = {
  id: string;
  ts: string;
  user: string;
  action: AuditAction;
  actionLabel: string;
  target: { href?: string; text: string; mono?: boolean; dim?: boolean };
};

export type AuditListProps = {
  labels: {
    chipAll: string;
    chipDoc: string;
    chipUser: string;
    chipSystem: string;
    chipSetting: string;
    searchPh: string;
    dateFrom: string;
    dateTo: string;
    csvExport: string;
    columns: { ts: string; user: string; action: string; target: string };
    pageInfo: string;
    empty: string;
    prev: string;
    next: string;
  };
  counts: { all: number; doc: number; user: number; system: number; setting: number };
  rows: AuditRow[];
  activeType: AuditType;
  search: string;
  from: string;
  to: string;
  page: number;
  pageSize: number;
  total: number;
};

function ActionIcon({ a }: { a: AuditAction }) {
  switch (a) {
    case 'create':
      return <Plus size={11} strokeWidth={2.5} />;
    case 'post':
      return <Check size={11} strokeWidth={2.5} />;
    case 'delete':
      return <X size={11} strokeWidth={2.5} />;
    case 'login':
      return <Lock size={11} strokeWidth={2} />;
    case 'webhook':
    case 'cron':
      return <RefreshCw size={11} strokeWidth={2} />;
    case 'invite':
      return <UserPlus size={11} strokeWidth={2} />;
    case 'post_fail':
      return <X size={11} strokeWidth={2.5} />;
    default:
      return <Edit size={11} strokeWidth={2} />;
  }
}

function dotClass(a: AuditAction) {
  if (a === 'create') return 'act-dot create';
  if (a === 'post') return 'act-dot post';
  if (a === 'delete' || a === 'post_fail') return 'act-dot delete';
  if (a === 'login' || a === 'webhook' || a === 'cron') return 'act-dot login';
  if (a === 'invite') return 'act-dot create';
  return 'act-dot update';
}

function buildQuery(params: Record<string, string | number | null | undefined>): string {
  const sp = new URLSearchParams();
  for (const [k, v] of Object.entries(params)) {
    if (v === null || v === undefined || v === '') continue;
    sp.set(k, String(v));
  }
  const s = sp.toString();
  return s ? `?${s}` : '';
}

export function V2AuditList(p: AuditListProps) {
  const router = useRouter();
  const [, startTransition] = useTransition();
  const [searchValue, setSearchValue] = useState(p.search);

  // Base params that survive every navigation (everything but page).
  const base = {
    type: p.activeType === 'all' ? undefined : p.activeType,
    q: p.search || undefined,
    from: p.from || undefined,
    to: p.to || undefined,
  };

  function push(next: Record<string, string | number | null | undefined>) {
    startTransition(() => {
      router.push(`/admin/audit${buildQuery(next)}`);
    });
  }

  // Sync local search if the URL changed externally.
  useEffect(() => {
    setSearchValue(p.search);
  }, [p.search]);

  // Live search: debounce typing and push ?q= (reset to page 1). Inlines the
  // nav so the effect depends only on primitives (router is stable).
  useEffect(() => {
    if (searchValue === p.search) return;
    const handle = setTimeout(() => {
      const qs = buildQuery({
        type: p.activeType === 'all' ? undefined : p.activeType,
        from: p.from || undefined,
        to: p.to || undefined,
        q: searchValue || undefined,
      });
      router.push(`/admin/audit${qs}`);
    }, 300);
    return () => clearTimeout(handle);
  }, [searchValue, p.search, p.activeType, p.from, p.to, router]);

  const chips: { key: AuditType; label: string; count: number }[] = [
    { key: 'all', label: p.labels.chipAll, count: p.counts.all },
    { key: 'doc', label: p.labels.chipDoc, count: p.counts.doc },
    { key: 'user', label: p.labels.chipUser, count: p.counts.user },
    { key: 'system', label: p.labels.chipSystem, count: p.counts.system },
    { key: 'setting', label: p.labels.chipSetting, count: p.counts.setting },
  ];

  const totalPages = Math.max(1, Math.ceil(p.total / p.pageSize));

  function pagerHref(page: number): string {
    return `/admin/audit${buildQuery({ ...base, page: page === 1 ? undefined : page })}`;
  }

  function visiblePages(): number[] {
    const out: number[] = [];
    out.push(1);
    if (p.page > 3) out.push(-1);
    for (let i = Math.max(2, p.page - 1); i <= Math.min(totalPages - 1, p.page + 1); i++) {
      out.push(i);
    }
    if (p.page < totalPages - 2) out.push(-1);
    if (totalPages > 1) out.push(totalPages);
    return out;
  }

  return (
    <section className="table-card">
      <div className="table-toolbar">
        <div className="left">
          <div className="chip-row">
            {chips.map((c) => (
              <button
                key={c.key}
                type="button"
                className={`chip${p.activeType === c.key ? ' is-active' : ''}`}
                onClick={() =>
                  push({ ...base, type: c.key === 'all' ? undefined : c.key, page: undefined })
                }
              >
                {c.label} <span className="count">{c.count.toLocaleString()}</span>
              </button>
            ))}
          </div>
        </div>
        <div className="right">
          <form
            className="search-input"
            style={{ display: 'flex', alignItems: 'center' }}
            onSubmit={(e) => {
              e.preventDefault();
              push({ ...base, q: searchValue || undefined, page: undefined });
            }}
          >
            <Search size={14} strokeWidth={1.75} />
            <input
              type="search"
              name="q"
              placeholder={p.labels.searchPh}
              value={searchValue}
              onChange={(e) => setSearchValue(e.target.value)}
              aria-label={p.labels.searchPh}
            />
          </form>
          <input
            type="date"
            className="input"
            style={{ width: 'auto', height: 30, fontSize: 12.5, padding: '0 8px' }}
            value={p.from}
            aria-label={p.labels.dateFrom}
            title={p.labels.dateFrom}
            onChange={(e) => push({ ...base, from: e.target.value || undefined, page: undefined })}
          />
          <input
            type="date"
            className="input"
            style={{ width: 'auto', height: 30, fontSize: 12.5, padding: '0 8px' }}
            value={p.to}
            aria-label={p.labels.dateTo}
            title={p.labels.dateTo}
            onChange={(e) => push({ ...base, to: e.target.value || undefined, page: undefined })}
          />
          <button
            type="button"
            className="btn btn-secondary btn-sm"
            onClick={(e) =>
              exportNearestTable(
                e.currentTarget,
                `audit-${new Date().toISOString().slice(0, 10)}.csv`,
              )
            }
            aria-label={p.labels.csvExport}
          >
            <Download size={14} strokeWidth={1.75} />
            {p.labels.csvExport}
          </button>
        </div>
      </div>

      <table className="data">
        <thead>
          <tr>
            <th>{p.labels.columns.ts}</th>
            <th>{p.labels.columns.user}</th>
            <th>{p.labels.columns.action}</th>
            <th>{p.labels.columns.target}</th>
            <th />
          </tr>
        </thead>
        <tbody>
          {p.rows.length === 0 ? (
            <tr>
              <td
                colSpan={5}
                style={{ padding: 32, textAlign: 'center', color: 'var(--text-muted)' }}
              >
                {p.labels.empty}
              </td>
            </tr>
          ) : (
            p.rows.map((r) => (
              <tr key={r.id}>
                <td className="mono">{r.ts}</td>
                <td>{r.user}</td>
                <td>
                  <span className={dotClass(r.action)}>
                    <ActionIcon a={r.action} />
                  </span>
                  {r.actionLabel}
                </td>
                <td>
                  {r.target.href ? (
                    <Link
                      href={r.target.href}
                      className={r.target.mono ? 'mono' : undefined}
                      style={{ color: 'var(--text)' }}
                    >
                      {r.target.text}
                    </Link>
                  ) : (
                    <span className={`${r.target.mono ? 'mono ' : ''}${r.target.dim ? 'dim' : ''}`}>
                      {r.target.text}
                    </span>
                  )}
                </td>
                <td>
                  <Link href={`/admin/audit/${r.id}`} className="row-menu" aria-label="More">
                    <MoreHorizontal size={14} strokeWidth={1.75} />
                  </Link>
                </td>
              </tr>
            ))
          )}
        </tbody>
      </table>

      <div className="table-footer">
        <div>{p.labels.pageInfo}</div>
        <div className="pager">
          {p.page > 1 ? (
            <Link href={pagerHref(p.page - 1)} className="pg" aria-label={p.labels.prev}>
              <ChevronLeft size={12} strokeWidth={1.75} />
            </Link>
          ) : (
            <span className="pg" aria-disabled="true">
              <ChevronLeft size={12} strokeWidth={1.75} />
            </span>
          )}
          {visiblePages().map((pg, i) =>
            pg === -1 ? (
              // biome-ignore lint/suspicious/noArrayIndexKey: ellipsis gaps in pager are positional and stable
              <span key={`gap-${i}`} className="pg">
                …
              </span>
            ) : pg === p.page ? (
              <span key={pg} className="pg is-active">
                {pg}
              </span>
            ) : (
              <Link key={pg} href={pagerHref(pg)} className="pg">
                {pg}
              </Link>
            ),
          )}
          {p.page < totalPages ? (
            <Link href={pagerHref(p.page + 1)} className="pg" aria-label={p.labels.next}>
              <ChevronRight size={12} strokeWidth={1.75} />
            </Link>
          ) : (
            <span className="pg" aria-disabled="true">
              <ChevronRight size={12} strokeWidth={1.75} />
            </span>
          )}
        </div>
      </div>
    </section>
  );
}
