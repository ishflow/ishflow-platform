'use client';

import { DEFAULT_PAGE_SIZE, pageRange, totalPages as toTotalPages } from '@/lib/list/pagination';
import { Link, usePathname } from '@/platform/i18n/navigation';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { useSearchParams } from 'next/navigation';

/**
 * Shared, page-level pager for document/register/catalog lists. Renders below
 * the list table. Builds `?page=` hrefs that preserve all other query params
 * (status, search, sort…) so pagination composes with existing filters.
 *
 * Server loaders pass the TRUE total (a real `count()`), so users can reach
 * every record — not just the first page.
 */
export function V2ListPager({
  total,
  page,
  pageSize = DEFAULT_PAGE_SIZE,
}: {
  total: number;
  page: number;
  pageSize?: number;
}) {
  const t = useTranslations('pager');
  const pathname = usePathname();
  const search = useSearchParams();
  const pages = toTotalPages(total, pageSize);
  const { from, to } = pageRange(page, pageSize, total);

  const hrefFor = (p: number): string => {
    const params = new URLSearchParams(search?.toString() ?? '');
    if (p <= 1) params.delete('page');
    else params.set('page', String(p));
    const qs = params.toString();
    return qs ? `${pathname}?${qs}` : pathname;
  };

  const visible = (): number[] => {
    const out: number[] = [1];
    if (page > 3) out.push(-1);
    for (let i = Math.max(2, page - 1); i <= Math.min(pages - 1, page + 1); i++) out.push(i);
    if (page < pages - 2) out.push(-1);
    if (pages > 1) out.push(pages);
    return out;
  };

  // Single page of data — nothing to page through.
  if (pages <= 1) {
    return (
      <div className="table-footer">
        <div>{t('showing', { from, to, total, pageSize })}</div>
      </div>
    );
  }

  return (
    <div className="table-footer">
      <div>{t('showing', { from, to, total, pageSize })}</div>
      <div className="pager">
        {page > 1 ? (
          <Link href={hrefFor(page - 1)} className="pg" aria-label={t('previous')}>
            <ChevronLeft size={12} strokeWidth={1.75} />
          </Link>
        ) : (
          <span className="pg" aria-disabled="true">
            <ChevronLeft size={12} strokeWidth={1.75} />
          </span>
        )}
        {visible().map((p, i) =>
          p === -1 ? (
            // biome-ignore lint/suspicious/noArrayIndexKey: ellipsis gaps are positional and stable
            <span key={`gap-${i}`} className="pg">
              …
            </span>
          ) : p === page ? (
            <span key={p} className="pg is-active">
              {p}
            </span>
          ) : (
            <Link key={p} href={hrefFor(p)} className="pg">
              {p}
            </Link>
          ),
        )}
        {page < pages ? (
          <Link href={hrefFor(page + 1)} className="pg" aria-label={t('next')}>
            <ChevronRight size={12} strokeWidth={1.75} />
          </Link>
        ) : (
          <span className="pg" aria-disabled="true">
            <ChevronRight size={12} strokeWidth={1.75} />
          </span>
        )}
      </div>
    </div>
  );
}
