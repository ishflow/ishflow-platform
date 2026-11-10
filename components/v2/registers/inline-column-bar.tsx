'use client';

import { Lock, X } from 'lucide-react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useTransition } from 'react';

export type InlineColumnBarColumn = {
  code: string;
  title: string;
  subtitle?: string;
  locked: boolean;
};

export type InlineColumnBarProps = {
  viewId: string;
  columns: InlineColumnBarColumn[];
  visibleCodes: string[];
  i18n: {
    label: string;
    showAll: string;
    onlyLocked: string;
    lockedHint: string;
  };
};

/**
 * Inline column bar — V4 design.
 *
 * Tüm sütun tipleri matrix'in hemen üstünde rozet olarak görünür:
 * 🔒 kilitli (gri, tıklanamaz) → mavi görünür (× ile kapat) → gri gizli (+ ile aç).
 * Dropdown yok, popover yok. Tek tıkla aç/kapa.
 *
 * Her tıklamada:
 * 1. URL `?cols=` rewrite (instant render)
 * 2. POST /api/view-prefs (fire-and-forget — DB persist)
 */
export function V2InlineColumnBar({ viewId, columns, visibleCodes, i18n }: InlineColumnBarProps) {
  const router = useRouter();
  const params = useSearchParams();
  const [pending, startTransition] = useTransition();

  const lockedCodes = columns.filter((c) => c.locked).map((c) => c.code);
  const lockedSet = new Set(lockedCodes);
  const visibleSet = new Set(visibleCodes);

  const lockedCols = columns.filter((c) => c.locked);
  const activeCols = columns.filter((c) => !c.locked && visibleSet.has(c.code));
  const hiddenCols = columns.filter((c) => !c.locked && !visibleSet.has(c.code));

  const pushCols = (codes: string[]) => {
    const final = [...lockedCodes, ...codes.filter((c) => !lockedSet.has(c))];
    const next = new URLSearchParams(params);
    next.set('cols', final.join(','));
    startTransition(async () => {
      router.push(`?${next.toString()}`, { scroll: false });
      try {
        await fetch('/api/view-prefs', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ viewId, payload: { cols: final } }),
        });
      } catch {
        /* swallow — URL holds the truth */
      }
    });
  };

  const toggle = (code: string) => {
    if (lockedSet.has(code)) return;
    const next = new Set(activeCols.map((c) => c.code));
    if (next.has(code)) next.delete(code);
    else next.add(code);
    pushCols(Array.from(next));
  };

  const showAll = () => {
    pushCols(columns.filter((c) => !c.locked).map((c) => c.code));
  };

  const onlyLocked = () => {
    pushCols([]);
  };

  return (
    <div className="colbar" data-pending={pending ? 'true' : undefined}>
      <span className="colbar-label">{i18n.label}</span>

      {lockedCols.map((col) => (
        <span
          key={col.code}
          className="colbar-chip is-locked"
          title={i18n.lockedHint}
          aria-disabled
        >
          <Lock className="lock" strokeWidth={1.75} size={10} />
          {col.title}
        </span>
      ))}

      {activeCols.length > 0 ? <span className="colbar-divider" /> : null}

      {activeCols.map((col) => (
        <button
          key={col.code}
          type="button"
          className="colbar-chip is-visible"
          onClick={() => toggle(col.code)}
        >
          {col.title}
          <X className="xmark" strokeWidth={2} size={10} />
        </button>
      ))}

      {hiddenCols.length > 0 ? <span className="colbar-divider" /> : null}

      {hiddenCols.map((col) => (
        <button
          key={col.code}
          type="button"
          className="colbar-chip"
          onClick={() => toggle(col.code)}
        >
          <span className="plus">+</span>
          {col.title}
        </button>
      ))}

      <div className="colbar-presets">
        <button type="button" className="colbar-preset" onClick={showAll}>
          {i18n.showAll}
        </button>
        <span className="sep">·</span>
        <button type="button" className="colbar-preset" onClick={onlyLocked}>
          {i18n.onlyLocked}
        </button>
      </div>
    </div>
  );
}
