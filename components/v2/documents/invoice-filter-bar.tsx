'use client';

import { exportNearestTable } from '@/lib/v2-shell/csv-export';
import { Link, usePathname, useRouter } from '@/platform/i18n/navigation';
import { Download, Filter, Plus, Search } from 'lucide-react';
import { useSearchParams } from 'next/navigation';
import { useEffect, useRef, useState, useTransition } from 'react';

export type InvoiceFilterBarProps = {
  statuses: Array<{ key: string; label: string; count: number }>;
  activeStatus: string;
  onStatusChange: (key: string) => void;
  searchPlaceholder: string;
  filterLabel: string;
  exportLabel: string;
  newLabel: string;
  newHref: string;
  /** CSV filename stem (no extension). Defaults to `invoices`. */
  exportFilename?: string;
};

/**
 * Twin of V2DocFilterBar specialised for /v2/documents/sales-invoice (the
 * polished "invoice-card" layout). Same wiring contract: URL-driven search
 * + status chips, popover status filter, client-side CSV export.
 */
export function V2InvoiceFilterBar(props: InvoiceFilterBarProps) {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();
  const [pending, startTransition] = useTransition();
  const [searchValue, setSearchValue] = useState(params.get('q') ?? '');
  const [filterOpen, setFilterOpen] = useState(false);
  const filterRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    setSearchValue(params.get('q') ?? '');
  }, [params]);

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
    next.delete('page');
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
    const base = props.exportFilename ?? 'invoices';
    const stamp = new Date().toISOString().slice(0, 10);
    exportNearestTable(e.currentTarget, `${base}-${stamp}.csv`);
  }

  return (
    <div className="table-toolbar">
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
            aria-expanded={filterOpen}
            onClick={() => setFilterOpen((o) => !o)}
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
        <Link href={props.newHref} className="btn btn-primary btn-sm">
          <Plus size={14} strokeWidth={1.75} />
          {props.newLabel}
        </Link>
      </div>
    </div>
  );
}
