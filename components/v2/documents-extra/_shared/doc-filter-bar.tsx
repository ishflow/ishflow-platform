'use client';

import { exportNearestTable } from '@/lib/v2-shell/csv-export';
import { Link, usePathname, useRouter } from '@/platform/i18n/navigation';
import { Download, Filter, Plus, Search, Zap } from 'lucide-react';
import { useSearchParams } from 'next/navigation';
import { useEffect, useRef, useState, useTransition } from 'react';

export type DocFilterBarProps = {
  statuses: Array<{ key: string; label: string; count: number }>;
  activeStatus: string;
  /**
   * Legacy local-state callback. Still invoked for compatibility with
   * callers that filter rows in-memory; we ALSO push `?status=<key>` to
   * the URL so server-rendered lists can pick the filter up on reload.
   */
  onStatusChange: (key: string) => void;
  searchPlaceholder: string;
  filterLabel: string;
  exportLabel: string;
  newLabel: string;
  newHref: string;
  quickLabel?: string;
  quickHref?: string;
  /** File-name (without `.csv`) for the export download. Defaults to "export". */
  exportFilename?: string;
};

/**
 * Shared toolbar for V2 document/catalog list pages.
 *
 * Wires:
 *   - search input → ?q= via `router.push` (URL-driven; server lists pick up)
 *   - status chips → ?status= + caller's onStatusChange (dual to keep current
 *     in-memory filtering working alongside URL state)
 *   - filter button → a popover stub (TODO: per-entity advanced filters)
 *   - export button → client-side CSV of the adjacent `<table.data>`
 *
 * Designed to be a drop-in replacement for the dumb-presentational version:
 * existing callers keep their API; nothing breaks.
 */
export function V2DocFilterBar(props: DocFilterBarProps) {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();
  const [pending, startTransition] = useTransition();
  const [searchValue, setSearchValue] = useState(params.get('q') ?? '');
  const [filterOpen, setFilterOpen] = useState(false);
  const filterRef = useRef<HTMLDivElement | null>(null);
  const toolbarRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    setSearchValue(params.get('q') ?? '');
  }, [params]);

  // Close filter popover on outside click.
  useEffect(() => {
    if (!filterOpen) return;
    function onClick(e: MouseEvent) {
      if (filterRef.current && !filterRef.current.contains(e.target as Node)) {
        setFilterOpen(false);
      }
    }
    document.addEventListener('mousedown', onClick);
    return () => document.removeEventListener('mousedown', onClick);
  }, [filterOpen]);

  function pushWith(updates: Record<string, string | null>) {
    const next = new URLSearchParams(Array.from(params.entries()));
    for (const [k, v] of Object.entries(updates)) {
      if (v === null || v === '') next.delete(k);
      else next.set(k, v);
    }
    next.delete('page'); // any filter change resets pagination
    const qs = next.toString();
    startTransition(() => {
      router.push(qs ? `${pathname}?${qs}` : pathname);
    });
  }

  function handleSearchSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    pushWith({ q: searchValue.trim() || null });
  }

  function handleStatusChip(key: string) {
    props.onStatusChange(key);
    pushWith({ status: key === 'all' ? null : key });
  }

  function handleExport(e: React.MouseEvent<HTMLButtonElement>) {
    const base = props.exportFilename ?? 'export';
    const stamp = new Date().toISOString().slice(0, 10);
    const ok = exportNearestTable(e.currentTarget, `${base}-${stamp}.csv`);
    if (!ok) {
      // Fall back to scanning the whole document — useful when the bar
      // is mounted above the table without a shared `.table-card` wrapper.
      const table = document.querySelector('table.data') as HTMLTableElement | null;
      if (table) {
        import('@/lib/v2-shell/csv-export').then(({ exportTableToCsv }) =>
          exportTableToCsv(table, `${base}-${stamp}.csv`),
        );
      }
    }
  }

  return (
    <div className="table-toolbar" ref={toolbarRef}>
      <div className="left">
        <div className="chip-row">
          {props.statuses.map((s) => (
            <button
              key={s.key}
              type="button"
              className={`chip${s.key === props.activeStatus ? ' is-active' : ''}`}
              onClick={() => handleStatusChip(s.key)}
              disabled={pending}
            >
              {s.label} <span className="count">{s.count}</span>
            </button>
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
            placeholder={props.searchPlaceholder}
            aria-label={props.searchPlaceholder}
            value={searchValue}
            onChange={(e) => setSearchValue(e.target.value)}
            disabled={pending}
          />
        </form>
        <div ref={filterRef} style={{ position: 'relative' }}>
          <button
            type="button"
            className={`btn btn-secondary btn-sm${filterOpen ? ' is-on' : ''}`}
            onClick={() => setFilterOpen((o) => !o)}
            aria-expanded={filterOpen}
          >
            <Filter size={14} strokeWidth={1.75} />
            {props.filterLabel}
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
                {props.filterLabel}
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                {props.statuses.map((s) => (
                  <button
                    key={`pop-${s.key}`}
                    type="button"
                    className={`chip${s.key === props.activeStatus ? ' is-active' : ''}`}
                    style={{ justifyContent: 'space-between', width: '100%' }}
                    onClick={() => {
                      handleStatusChip(s.key);
                      setFilterOpen(false);
                    }}
                  >
                    <span>{s.label}</span>
                    <span className="count">{s.count}</span>
                  </button>
                ))}
              </div>
            </div>
          ) : null}
        </div>
        <button
          type="button"
          className="btn btn-secondary btn-sm"
          onClick={handleExport}
          aria-label={props.exportLabel}
        >
          <Download size={14} strokeWidth={1.75} />
          {props.exportLabel}
        </button>
        {props.quickHref && props.quickLabel ? (
          <Link href={props.quickHref} className="btn btn-secondary btn-sm">
            <Zap size={14} strokeWidth={1.75} />
            {props.quickLabel}
          </Link>
        ) : null}
        <Link href={props.newHref} className="btn btn-primary btn-sm">
          <Plus size={14} strokeWidth={1.75} />
          {props.newLabel}
        </Link>
      </div>
    </div>
  );
}
