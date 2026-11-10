'use client';

import { Link, useRouter } from '@/platform/i18n/navigation';
import { ChevronLeft, ChevronRight, Download, MoreHorizontal, Search } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { useEffect, useState, useTransition } from 'react';
import { PriceTypeSplitCta } from './price-type-split-cta';

export type PriceTypeListRow = {
  id: string;
  name: string;
  kind: string;
  symbol: string;
  description: string;
  baseName: string | null;
  markupPct: number | null;
  isDefault: boolean;
  isArchived: boolean;
};

type Props = {
  rows: PriceTypeListRow[];
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

export function PriceTypeList({
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
  const t = useTranslations('v2_catalogs.priceTypes.list');
  const tc = useTranslations('v2_catalogs.common');
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [searchValue, setSearchValue] = useState(search);

  useEffect(() => {
    setSearchValue(search);
  }, [search]);

  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const fromIdx = total === 0 ? 0 : (page - 1) * pageSize + 1;
  const toIdx = Math.min(page * pageSize, total);

  function statusHref(s: string): string {
    return `/catalogs/price-types${buildQuery({ status: s === 'active' ? undefined : s, q: search || undefined })}`;
  }

  function handleSearchSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    startTransition(() => {
      const qs = buildQuery({
        status: activeStatus === 'active' ? undefined : activeStatus,
        q: searchValue || undefined,
        page: 1,
      });
      router.push(`/catalogs/price-types${qs}`);
    });
  }

  function pagerHref(p: number): string {
    return `/catalogs/price-types${buildQuery({
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
              disabled={pending}
            />
          </form>
          <button type="button" className="btn btn-secondary btn-sm" disabled aria-disabled="true">
            <Download size={14} strokeWidth={1.75} />
            {tc('export')}
          </button>
          <PriceTypeSplitCta />
        </div>
      </div>

      <table className="data">
        <thead>
          <tr>
            <th style={{ width: 36 }}>
              <span className="checkbox" />
            </th>
            <th>{tc('name')}</th>
            <th>{t('columns.kind')}</th>
            <th>{t('columns.base')}</th>
            <th className="num">{t('columns.markup')}</th>
            <th>{t('columns.default')}</th>
            <th>{tc('status')}</th>
            <th />
          </tr>
        </thead>
        <tbody>
          {rows.length === 0 ? (
            <tr>
              <td
                colSpan={8}
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
                <td>
                  <Link href={`/catalogs/price-types/${r.id}`} className="row-title">
                    {r.name}
                  </Link>
                  {r.description ? <div className="row-sub">{r.description}</div> : null}
                </td>
                <td>
                  <span className={`pill pill-${r.kind === 'static' ? 'neutral' : 'info'}`}>
                    {r.kind === 'static' ? t('kindStaticShort') : t('kindDynamicShort')}
                  </span>
                </td>
                <td>{r.baseName ?? <span className="dim">—</span>}</td>
                <td className="num">
                  {r.markupPct != null ? (
                    `${(r.markupPct * 100).toFixed(2)}%`
                  ) : (
                    <span className="dim">—</span>
                  )}
                </td>
                <td>
                  {r.isDefault ? (
                    <span className="pill pill-success">{tc('default')}</span>
                  ) : (
                    <span className="dim">—</span>
                  )}
                </td>
                <td>
                  <span className={`pill pill-${r.isArchived ? 'neutral' : 'success'}`}>
                    {r.isArchived ? tc('archived') : tc('active')}
                  </span>
                </td>
                <td>
                  <Link
                    href={`/catalogs/price-types/${r.id}`}
                    className="row-menu"
                    aria-label={tc('actions')}
                  >
                    <MoreHorizontal size={14} strokeWidth={1.75} />
                  </Link>
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
              // biome-ignore lint/suspicious/noArrayIndexKey: pager gap positional
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
