'use client';

import { exportNearestTable } from '@/lib/v2-shell/csv-export';
import { Link, useRouter } from '@/platform/i18n/navigation';
import {
  ChevronLeft,
  ChevronRight,
  Download,
  Filter,
  MoreHorizontal,
  Plus,
  Search,
} from 'lucide-react';
import { useLocale, useTranslations } from 'next-intl';
import { useEffect, useRef, useState, useTransition } from 'react';
import { restoreCustomer } from './partner-restore-actions';

export type CustomerListRow = {
  id: string;
  code: string;
  name: string;
  email: string;
  phone: string;
  priceType: string;
  lastSale: string;
  deletedAt: string | null;
};

type Props = {
  rows: CustomerListRow[];
  total: number;
  allTotal: number;
  activeTotal: number;
  archivedTotal: number;
  search: string;
  page: number;
  pageSize: number;
  activeStatus: string;
};

function buildQuery(params: Record<string, string | number | null | undefined>): string {
  const sp = new URLSearchParams();
  for (const [k, v] of Object.entries(params)) {
    if (v === null || v === undefined || v === '' || v === 0) continue;
    sp.set(k, String(v));
  }
  const s = sp.toString();
  return s ? `?${s}` : '';
}

export function CustomerList({
  rows,
  total,
  allTotal,
  activeTotal,
  archivedTotal,
  search,
  page,
  pageSize,
  activeStatus,
}: Props) {
  const t = useTranslations('v2_catalogs.partners.customers.list');
  const tc = useTranslations('v2_catalogs.common');
  const router = useRouter();
  const locale = useLocale();
  const [, startTransition] = useTransition();
  const [searchValue, setSearchValue] = useState(search);
  const [filterOpen, setFilterOpen] = useState(false);
  const filterPopRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setSearchValue(search);
  }, [search]);

  // Close the filter popover on outside click.
  useEffect(() => {
    if (!filterOpen) return;
    function onDown(e: MouseEvent) {
      if (filterPopRef.current && !filterPopRef.current.contains(e.target as Node)) {
        setFilterOpen(false);
      }
    }
    document.addEventListener('mousedown', onDown);
    return () => document.removeEventListener('mousedown', onDown);
  }, [filterOpen]);

  // Live search: debounce typing and push ?q= so the list filters as you type.
  useEffect(() => {
    if (searchValue === search) return;
    const handle = setTimeout(() => {
      startTransition(() => {
        const qs = buildQuery({
          status: activeStatus === 'active' ? undefined : activeStatus,
          q: searchValue || undefined,
          page: 1,
        });
        router.push(`/catalogs/partners/customers${qs}`);
      });
    }, 300);
    return () => clearTimeout(handle);
  }, [searchValue, search, activeStatus, router]);

  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const fromIdx = total === 0 ? 0 : (page - 1) * pageSize + 1;
  const toIdx = Math.min(page * pageSize, total);

  function statusHref(s: string): string {
    return `/catalogs/partners/customers${buildQuery({ status: s === 'active' ? undefined : s, q: search || undefined })}`;
  }

  function handleSearchSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    startTransition(() => {
      const qs = buildQuery({
        status: activeStatus === 'active' ? undefined : activeStatus,
        q: searchValue || undefined,
        page: 1,
      });
      router.push(`/catalogs/partners/customers${qs}`);
    });
  }

  function pagerHref(p: number): string {
    return `/catalogs/partners/customers${buildQuery({
      status: activeStatus === 'active' ? undefined : activeStatus,
      q: search || undefined,
      page: p === 1 ? undefined : p,
    })}`;
  }

  function visiblePages(): number[] {
    const out: number[] = [];
    out.push(1);
    if (page > 3) out.push(-1);
    for (let i = Math.max(2, page - 1); i <= Math.min(totalPages - 1, page + 1); i++) {
      out.push(i);
    }
    if (page < totalPages - 2) out.push(-1);
    if (totalPages > 1) out.push(totalPages);
    return out;
  }

  return (
    <section className="table-card">
      <div className="table-toolbar">
        <div className="left">
          <div className="chip-row">
            {[
              { k: 'all', label: tc('all'), count: allTotal },
              { k: 'active', label: tc('active'), count: activeTotal },
              { k: 'archived', label: tc('archived'), count: archivedTotal },
            ].map((c) => (
              <Link
                key={c.k}
                href={statusHref(c.k)}
                className={`chip${activeStatus === c.k || (c.k === 'active' && !activeStatus) ? ' is-active' : ''}`}
              >
                {c.label} <span className="count">{c.count}</span>
              </Link>
            ))}
          </div>
        </div>
        <div className="right">
          <form
            onSubmit={handleSearchSubmit}
            className="search-input"
            style={{ display: 'flex', alignItems: 'center' }}
          >
            <Search size={14} strokeWidth={1.75} />
            <input
              type="search"
              name="q"
              placeholder={t('searchPlaceholder')}
              value={searchValue}
              onChange={(e) => setSearchValue(e.target.value)}
              aria-label={t('searchPlaceholder')}
            />
          </form>
          <div ref={filterPopRef} style={{ position: 'relative', display: 'inline-block' }}>
            <button
              type="button"
              className={`btn btn-secondary btn-sm${filterOpen ? ' is-on' : ''}`}
              aria-expanded={filterOpen}
              onClick={() => setFilterOpen((o) => !o)}
            >
              <Filter size={14} strokeWidth={1.75} />
              {tc('filter')}
            </button>
            {filterOpen ? (
              <div
                role="menu"
                style={{
                  position: 'absolute',
                  top: 'calc(100% + 6px)',
                  right: 0,
                  minWidth: 200,
                  background: 'var(--surface, #fff)',
                  border: '1px solid var(--border, #e5e5e5)',
                  borderRadius: 10,
                  boxShadow: '0 6px 24px rgba(0,0,0,0.08)',
                  padding: 12,
                  zIndex: 50,
                }}
              >
                <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                  {['all', 'active', 'archived'].map((s) => (
                    <Link
                      key={s}
                      href={statusHref(s)}
                      className={`chip${(activeStatus || 'active') === s ? ' is-active' : ''}`}
                      style={{ justifyContent: 'flex-start', width: '100%' }}
                      onClick={() => setFilterOpen(false)}
                    >
                      {s === 'all' ? tc('all') : s === 'active' ? tc('active') : tc('archived')}
                    </Link>
                  ))}
                </div>
              </div>
            ) : null}
          </div>
          <button
            type="button"
            className="btn btn-secondary btn-sm"
            onClick={(e) =>
              exportNearestTable(
                e.currentTarget,
                `customers-${new Date().toISOString().slice(0, 10)}.csv`,
              )
            }
          >
            <Download size={14} strokeWidth={1.75} />
            {tc('export')}
          </button>
          <Link href="/catalogs/partners/customers/new" className="btn btn-primary btn-sm">
            <Plus size={14} strokeWidth={1.75} />
            {t('newCustomer')}
          </Link>
        </div>
      </div>

      <table className="data">
        <thead>
          <tr>
            <th style={{ width: 36 }}>
              <span className="checkbox" />
            </th>
            <th>{tc('code')}</th>
            <th>{tc('name')}</th>
            <th>{t('columns.email')}</th>
            <th>{t('columns.phone')}</th>
            <th>{t('columns.priceType')}</th>
            <th />
          </tr>
        </thead>
        <tbody>
          {rows.length === 0 ? (
            <tr>
              <td
                colSpan={7}
                style={{ padding: 32, textAlign: 'center', color: 'var(--text-muted)' }}
              >
                {t('empty')}
              </td>
            </tr>
          ) : (
            rows.map((r) => (
              <tr key={r.id}>
                <td>
                  <span className="checkbox" />
                </td>
                <td className="mono">{r.code}</td>
                <td>
                  <Link href={`/catalogs/partners/customers/${r.id}`} className="row-title">
                    {r.name}
                  </Link>
                  {r.email ? <div className="row-sub">{r.email}</div> : null}
                </td>
                <td>{r.email || <span className="dim">—</span>}</td>
                <td>{r.phone || <span className="dim">—</span>}</td>
                <td>{r.priceType || <span className="dim">—</span>}</td>
                <td>
                  {activeStatus === 'archived' ? (
                    <button
                      type="button"
                      className="btn btn-ghost btn-sm"
                      onClick={async () => {
                        const res = await restoreCustomer(locale, r.id);
                        if (res.ok) startTransition(() => router.refresh());
                      }}
                    >
                      {tc('restore')}
                    </button>
                  ) : (
                    <Link
                      href={`/catalogs/partners/customers/${r.id}`}
                      className="row-menu"
                      aria-label={tc('actions')}
                    >
                      <MoreHorizontal size={14} strokeWidth={1.75} />
                    </Link>
                  )}
                </td>
              </tr>
            ))
          )}
        </tbody>
      </table>

      <div className="table-footer">
        <div>{t('pagination.showing', { from: fromIdx, to: toIdx, total, pageSize })}</div>
        <div className="pager">
          {page > 1 ? (
            <Link href={pagerHref(page - 1)} className="pg" aria-label={tc('previous')}>
              <ChevronLeft size={12} strokeWidth={1.75} />
            </Link>
          ) : (
            <span className="pg" aria-disabled="true">
              <ChevronLeft size={12} strokeWidth={1.75} />
            </span>
          )}
          {visiblePages().map((p, i) =>
            p === -1 ? (
              // biome-ignore lint/suspicious/noArrayIndexKey: pager gap is positional
              <span key={`gap-${i}`} className="pg">
                …
              </span>
            ) : p === page ? (
              <span key={p} className="pg is-active">
                {p}
              </span>
            ) : (
              <Link key={p} href={pagerHref(p)} className="pg">
                {p}
              </Link>
            ),
          )}
          {page < totalPages ? (
            <Link href={pagerHref(page + 1)} className="pg" aria-label={tc('next')}>
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
