'use client';

import { usePathname } from '@/platform/i18n/navigation';
import type { ReactNode } from 'react';
import { detectDocMode } from './document-modes';

/**
 * Client-side switcher between four pre-rendered server panels.
 *
 * Order matters — catalog record routes match FIRST so a future shared
 * segment can't be hijacked by a less specific document pattern.
 *
 * - Catalog record route → `recordListPanel`
 * - Document/movement record route → `documentListPanel`
 * - Catalog list route → `catalogNavPanel`
 * - else → `defaultPanel`
 *
 * Document routes are routed through `detectDocMode` (single source of
 * truth in `./document-modes.ts`) — the panel client uses the same
 * function to pick its layout, so the two stay in sync.
 *
 * Server-side `headers().get('x-pathname')` was empty in Next.js 16 +
 * turbopack dev, so the decision lives in the client tree.
 */
export function V2PanelSwitcher({
  defaultPanel,
  catalogNavPanel,
  recordListPanel,
  documentListPanel,
}: {
  defaultPanel: ReactNode;
  catalogNavPanel: ReactNode;
  recordListPanel: ReactNode;
  documentListPanel: ReactNode;
}) {
  const pathname = usePathname();

  const RECORD_ROUTE_PATTERNS = [
    /\/v2\/catalogs\/products(?:\/categories|\/groups)?\/(?:new|[0-9a-f-]{36})(?:\/.*)?$/,
    /\/v2\/catalogs\/partners\/customers\/(?:new|[0-9a-f-]{36})(?:\/.*)?$/,
    /\/v2\/catalogs\/partners\/suppliers\/(?:new|[0-9a-f-]{36})(?:\/.*)?$/,
    /\/v2\/catalogs\/price-types\/special\/(?:new|[0-9a-f-]{36})(?:\/.*)?$/,
    /\/v2\/catalogs\/price-types\/(?:new|[0-9a-f-]{36})(?:\/.*)?$/,
  ];

  if (RECORD_ROUTE_PATTERNS.some((re) => re.test(pathname))) return <>{recordListPanel}</>;
  if (detectDocMode(pathname) !== null) return <>{documentListPanel}</>;
  if (/\/v2\/catalogs(\/|$)/.test(pathname)) return <>{catalogNavPanel}</>;

  return <>{defaultPanel}</>;
}
