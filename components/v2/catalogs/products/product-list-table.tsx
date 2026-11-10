'use client';

import {
  bulkArchiveProducts,
  restoreProducts,
} from '@/app/[locale]/(app)/catalogs/inventory.product/actions';
import { DeleteConfirmDialog } from '@/components/v2/shared/delete-confirm-dialog';
import { exportNearestTable } from '@/lib/v2-shell/csv-export';
import { Link } from '@/platform/i18n/navigation';
import { useRouter } from '@/platform/i18n/navigation';
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

export type ProductRow = {
  id: string;
  sku: string;
  name: string;
  category: string;
  group: string;
  deletedAt: string | null;
};

type Props = {
  rows: ProductRow[];
  total: number;
  search: string;
  page: number;
  pageSize: number;
  activeCategory: string | null;
  activeGroup: string | null;
  activeStatus: string | null;
  activeSort: string | null;
  activeDir: 'asc' | 'desc';
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

export function ProductListTable({
  rows,
  total,
  search,
  page,
  pageSize,
  activeCategory,
  activeGroup,
  activeStatus,
  activeSort,
  activeDir,
}: Props) {
  const t = useTranslations('v2_catalogs.products.list');
  const tc = useTranslations('v2_catalogs.common');
  const locale = useLocale();
  const router = useRouter();
  const [, startTransition] = useTransition();
  const [searchValue, setSearchValue] = useState(search);
  const [filterOpen, setFilterOpen] = useState(false);
  const filterPopRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!filterOpen) return;
    function onClick(e: MouseEvent) {
      if (filterPopRef.current && !filterPopRef.current.contains(e.target as Node)) {
        setFilterOpen(false);
      }
    }
    document.addEventListener('mousedown', onClick);
    return () => document.removeEventListener('mousedown', onClick);
  }, [filterOpen]);

  // Sync local search if URL changes externally
  useEffect(() => {
    setSearchValue(search);
  }, [search]);

  // Live search: debounce typing and push ?q= so the list filters as you type.
  useEffect(() => {
    if (searchValue === search) return;
    const handle = setTimeout(() => {
      startTransition(() => {
        const qs = buildQuery({
          cat: activeCategory ?? undefined,
          group: activeGroup ?? undefined,
          status: activeStatus ?? undefined,
          q: searchValue || undefined,
          page: 1,
        });
        router.push(`/catalogs/products${qs}`);
      });
    }, 300);
    return () => clearTimeout(handle);
  }, [searchValue, search, activeCategory, activeGroup, activeStatus, router]);

  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const fromIdx = total === 0 ? 0 : (page - 1) * pageSize + 1;
  const toIdx = Math.min(page * pageSize, total);
  const [selected, setSelected] = useState<string[]>([]);
  const toggle = (id: string) =>
    setSelected((s) => (s.includes(id) ? s.filter((x) => x !== id) : [...s, id]));
  const toggleAll = () =>
    setSelected((s) => (s.length === rows.length ? [] : rows.map((r) => r.id)));

  const baseQuery = {
    cat: activeCategory ?? undefined,
    group: activeGroup ?? undefined,
    status: activeStatus ?? undefined,
  };

  // Column sort (QA #76): clicking a sortable header toggles asc/desc via the
  // URL `?sort=&dir=` (the page loader applies the orderBy).
  function sortHref(col: 'sku' | 'name'): string {
    const nextDir = activeSort === col && activeDir === 'asc' ? 'desc' : 'asc';
    return `/catalogs/products${buildQuery({
      ...baseQuery,
      q: search || undefined,
      sort: col,
      dir: nextDir,
    })}`;
  }
  function sortArrow(col: string): string {
    if (activeSort !== col) return '';
    return activeDir === 'asc' ? ' ↑' : ' ↓';
  }

  function handleSearchSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    startTransition(() => {
      const qs = buildQuery({ ...baseQuery, q: searchValue || undefined, page: 1 });
      router.push(`/catalogs/products${qs}`);
    });
  }

  function pagerHref(p: number): string {
    return `/catalogs/products${buildQuery({
      ...baseQuery,
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
          <strong style={{ fontSize: 14 }}>
            {t('allProducts')}{' '}
            <span className="dim" style={{ fontWeight: 400 }}>
              ({total})
            </span>
          </strong>
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
                data-state="open"
                style={{
                  position: 'absolute',
                  top: 'calc(100% + 6px)',
                  right: 0,
                  minWidth: 220,
                  background: 'var(--surface, #fff)',
                  border: '1px solid var(--border, #e5e5e5)',
                  borderRadius: 10,
                  boxShadow: '0 6px 24px rgba(0,0,0,0.08)',
                  padding: 12,
                  zIndex: 50,
                }}
              >
                <div className="dim" style={{ fontSize: 11, marginBottom: 8 }}>
                  {t('statusFilter')}
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                  {['all', 'active', 'archived'].map((status) => (
                    <button
                      key={status}
                      type="button"
                      className={`chip${(activeStatus ?? 'active') === status ? ' is-active' : ''}`}
                      style={{ justifyContent: 'flex-start', width: '100%' }}
                      onClick={() => {
                        const qs = buildQuery({
                          ...baseQuery,
                          q: search || undefined,
                          status: status === 'active' ? undefined : status,
                          page: undefined,
                        });
                        startTransition(() => {
                          router.push(`/catalogs/products${qs}`);
                        });
                        setFilterOpen(false);
                      }}
                    >
                      {status === 'all'
                        ? tc('all')
                        : status === 'active'
                          ? tc('active')
                          : tc('archived')}
                    </button>
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
                `products-${new Date().toISOString().slice(0, 10)}.csv`,
              )
            }
          >
            <Download size={14} strokeWidth={1.75} />
            {tc('export')}
          </button>
          <Link href="/catalogs/products/new" className="btn btn-primary btn-sm">
            <Plus size={14} strokeWidth={1.75} />
            {t('newProduct')}
          </Link>
        </div>
      </div>

      {selected.length > 0 && (
        <div className="bulk-bar is-on">
          <div className="selected">{t('bulkSelected', { count: selected.length })}</div>
          <div className="actions">
            {activeStatus === 'archived' ? (
              <button
                type="button"
                className="btn btn-secondary btn-sm"
                onClick={async () => {
                  const res = await restoreProducts(locale, selected);
                  if (res.ok) {
                    setSelected([]);
                    startTransition(() => router.refresh());
                  }
                }}
              >
                {tc('restore')}
              </button>
            ) : (
              <DeleteConfirmDialog
                trigger={
                  <button type="button" className="btn btn-secondary btn-sm">
                    {tc('archive')}
                  </button>
                }
                title={t('bulkArchiveTitle')}
                description={t('bulkArchiveBody', { count: selected.length })}
                confirmLabel={tc('archive')}
                onConfirm={async () => {
                  const res = await bulkArchiveProducts(locale, selected);
                  if (res.ok) {
                    setSelected([]);
                    startTransition(() => router.refresh());
                  }
                }}
              />
            )}
          </div>
        </div>
      )}

      <table className="data is-compact">
        <thead>
          <tr>
            <th style={{ width: 36 }}>
              <button
                type="button"
                aria-label={tc('actions')}
                className={`checkbox${selected.length === rows.length && rows.length > 0 ? ' is-checked' : ''}`}
                onClick={toggleAll}
                style={{ border: 0, padding: 0, background: 'transparent' }}
              />
            </th>
            <th>
              <Link
                href={sortHref('sku')}
                style={{ color: 'inherit', textDecoration: 'none', cursor: 'pointer' }}
              >
                {t('columns.sku')}
                {sortArrow('sku')}
              </Link>
            </th>
            <th>
              <Link
                href={sortHref('name')}
                style={{ color: 'inherit', textDecoration: 'none', cursor: 'pointer' }}
              >
                {t('columns.name')}
                {sortArrow('name')}
              </Link>
            </th>
            <th>{t('columns.category')}</th>
            <th>{t('columns.group')}</th>
            <th />
          </tr>
        </thead>
        <tbody>
          {rows.length === 0 ? (
            <tr>
              <td
                colSpan={6}
                style={{ padding: 32, textAlign: 'center', color: 'var(--text-muted)' }}
              >
                {t('empty')}
              </td>
            </tr>
          ) : (
            rows.map((r) => {
              const isSel = selected.includes(r.id);
              return (
                <tr key={r.id}>
                  <td>
                    <button
                      type="button"
                      aria-label={isSel ? tc('clear') : tc('actions')}
                      className={`checkbox${isSel ? ' is-checked' : ''}`}
                      onClick={() => toggle(r.id)}
                      style={{ border: 0, padding: 0, background: 'transparent' }}
                    />
                  </td>
                  <td className="mono">
                    <Link href={`/catalogs/products/${r.id}`}>{r.sku}</Link>
                  </td>
                  <td>
                    <div className="row-title">
                      <Link href={`/catalogs/products/${r.id}`}>{r.name}</Link>
                    </div>
                  </td>
                  <td>
                    {r.category && r.category !== '—' ? (
                      <span className="pill pill-neutral">{r.category}</span>
                    ) : (
                      <span className="dim">—</span>
                    )}
                  </td>
                  <td>
                    {r.group && r.group !== '—' ? (
                      <span className="pill pill-neutral">{r.group}</span>
                    ) : (
                      <span className="dim">—</span>
                    )}
                  </td>
                  <td>
                    <Link
                      href={`/catalogs/products/${r.id}`}
                      className="row-menu"
                      aria-label={tc('actions')}
                    >
                      <MoreHorizontal size={14} strokeWidth={1.75} />
                    </Link>
                  </td>
                </tr>
              );
            })
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
              // biome-ignore lint/suspicious/noArrayIndexKey: ellipsis gaps in pager are positional and stable
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
