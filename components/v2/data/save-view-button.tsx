'use client';

import { Bookmark } from 'lucide-react';
import { useSearchParams } from 'next/navigation';
import { useState, useTransition } from 'react';

export type SaveViewButtonProps = {
  /** kind = register namespace, e.g. `"register:accounts-receivable"` */
  kind: string;
  /** Pre-localized label, e.g. "Görünümü kaydet". */
  label: string;
  /** Pre-localized prompt for the name input. */
  namePrompt: string;
  /** Pre-localized error message shown when save fails. */
  errorMessage: string;
};

/**
 * Toolbar button that snapshots the current `?period` / `?chip` / `?q`
 * URL params and POSTs them to /api/saved-views.
 *
 * Uses the browser `window.prompt` for the name input. The full modal
 * (`modal-kayitli-gorunum-kaydet.html` parity) is a follow-up; this
 * minimal flow ships the round-trip end-to-end so existing infra can
 * be validated before adding modal polish.
 */
export function V2SaveViewButton({ kind, label, namePrompt, errorMessage }: SaveViewButtonProps) {
  const params = useSearchParams();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  return (
    <>
      <button
        className="btn btn-secondary btn-sm"
        type="button"
        disabled={pending}
        onClick={() => {
          const name = typeof window !== 'undefined' ? window.prompt(namePrompt) : null;
          if (!name) return;
          const payload: Record<string, string> = {};
          for (const [k, v] of params.entries()) payload[k] = v;
          startTransition(async () => {
            try {
              const res = await fetch('/api/saved-views', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ kind, name, payload }),
              });
              if (!res.ok) throw new Error(`HTTP ${res.status}`);
              setError(null);
            } catch {
              setError(errorMessage);
            }
          });
        }}
      >
        <Bookmark size={14} strokeWidth={1.75} />
        {label}
      </button>
      {error ? <span className="pill pill-danger">{error}</span> : null}
    </>
  );
}
