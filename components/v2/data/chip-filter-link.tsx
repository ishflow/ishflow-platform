'use client';

import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import './data.css';

export type ChipLinkOption = {
  key: string;
  label: string;
  count?: number | null;
};

/**
 * Link-mode chip filter — clicking a chip rewrites `?chip=<key>` while
 * preserving every other query param. SSR-safe (renders as <a>), no
 * client-side state. Use inside register tables that drive their
 * loaders from URL params.
 */
export function V2ChipFilterLink({ options }: { options: ChipLinkOption[] }) {
  const params = useSearchParams();
  const current = params.get('chip') ?? options[0]?.key;
  return (
    <div className="chip-row">
      {options.map((o) => {
        const href = buildHref(params, o.key);
        const isActive = (current ?? '') === o.key;
        return (
          <Link
            key={o.key}
            href={href}
            className={`chip${isActive ? ' is-active' : ''}`}
            scroll={false}
          >
            {o.label}
            {typeof o.count === 'number' ? <span className="count">{o.count}</span> : null}
          </Link>
        );
      })}
    </div>
  );
}

function buildHref(params: URLSearchParams, chipKey: string): string {
  const next = new URLSearchParams(params);
  next.set('chip', chipKey);
  const qs = next.toString();
  return qs ? `?${qs}` : '?';
}
