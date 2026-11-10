import type { Prisma } from '@prisma/client';
import type { ReactNode } from 'react';
import type { LocalizedLabel } from './types';

/**
 * Period selection passed to register-view loaders. Parsed from the
 * `?period=` URL search param by `lib/v2-shell/parse-register-period`.
 *
 * - `month` — full calendar month
 * - `day` — single calendar day
 * - `range` — arbitrary [start, end] window
 *
 * `start` is inclusive, `end` exclusive (`< end` in queries).
 */
export type PeriodSelection =
  | { kind: 'month'; year: number; month: number; start: Date; end: Date }
  | { kind: 'day'; date: Date; start: Date; end: Date }
  | { kind: 'range'; start: Date; end: Date };

export type RegisterViewCtx = {
  tenant: { id: string; locale: string; currency: string };
  /** Transaction client bound to the current tenant via `withTenant`.
   *  Loaders MUST use this — querying via the bare `prisma` client
   *  bypasses RLS (the app.tenant_id GUC is transaction-scoped). */
  tx: Prisma.TransactionClient;
  period: PeriodSelection;
  /** Selected chip key, or null = "all". */
  chip: string | null;
  /** Search query, or null. */
  search: string | null;
  /** 1-based page for paginated register views (default 1). */
  page: number;
};

export type RegisterViewKpi = {
  /** Stable id used in i18n keys + telemetry. */
  id: string;
  label: LocalizedLabel;
  /** Pre-formatted by the loader (locale-aware money/number). */
  value: string;
  /** Optional period-over-period delta. */
  delta?: {
    direction: 'up' | 'down';
    /** Pre-formatted, e.g. "▲ 6.2%". */
    formatted: string;
    /** "Aylık" | "Haftalık" | "Yıllık" — locale-aware. */
    note: LocalizedLabel;
  };
  tone?: 'positive' | 'negative' | 'neutral';
};

export type RegisterChipOption = {
  /** Stable key, used as `?chip=<key>`. */
  key: string;
  label: LocalizedLabel;
  /** null = hide count. */
  count: number | null;
};

export type RegisterColumn = {
  key: string;
  label: LocalizedLabel;
  align?: 'left' | 'right';
};

export type RegisterRowCell = ReactNode;
export type RegisterRow = { id: string; cells: RegisterRowCell[] };

/**
 * Matrix-mode payload — for register views like Product Prices where
 * each cell is a (rowEntity × columnEntity) value. Loader returns ALL
 * columns; the renderer's column picker hides unticked ones via URL
 * `?cols=`. Locked columns always render regardless of URL.
 */
export type RegisterMatrixColumnHeader = {
  id: string;
  /** Stable code used in URL ?cols= filter (e.g. 'CST', 'PRC'). */
  code: string;
  title: string;
  /** Optional second line under the column title (e.g. "Statik" or formula). */
  subtitle?: string;
  /** If true, picker shows lock icon + disabled checkbox; column always rendered. */
  locked: boolean;
  /** If true, included in initial render when URL has no ?cols=. */
  defaultVisible: boolean;
};

export type RegisterMatrixRowHeader = {
  id: string;
  title: string;
  subtitle?: string;
};

export type RegisterMatrixCell = {
  /** Pre-formatted value, locale + currency aware. null → "—" placeholder. */
  formatted: string | null;
  /** Optional visual tag drawn under the cell value.
   *  - `'cost'` / `'l2'` — small label under price (product-prices)
   *  - `'low'` — yellow `pill-warning` wrapper (stock balance < min)
   *  - `'zero'` — red `pill-danger` wrapper (stock balance ≤ 0) */
  tag?: 'cost' | 'l2' | 'low' | 'zero';
};

export type RegisterMatrixPayload = {
  columns: RegisterMatrixColumnHeader[];
  rows: RegisterMatrixRowHeader[];
  /** cells[rowIdx][colIdx] — length must match rows.length × columns.length. */
  cells: RegisterMatrixCell[][];
};

/** One actionable link in an empty-state block. `href` is rendered as-is;
 *  relative hrefs like `?chip=movements` resolve against the current URL. */
export type RegisterEmptyStateAction = { label: string; href: string };

/** Loader-supplied empty-state, shown by the table in place of a blank body
 *  when `rows` is empty. Lets a register explain *why* it's empty (e.g. "all
 *  balances settled") and point the user to where the data actually lives. */
export type RegisterEmptyState = {
  title: string;
  subtitle?: string;
  actions?: RegisterEmptyStateAction[];
};

export type RegisterViewPayload = {
  kpis: RegisterViewKpi[];
  chips: RegisterChipOption[];
  rows: RegisterRow[];
  totalsRow?: RegisterRowCell[];
  totalCount: number;
  /** Count rendered in the subtitle; passed to `config.countLabel`. */
  subtitleCount: number;
  /** When set, the renderer draws a matrix and ignores `rows`. */
  matrix?: RegisterMatrixPayload;
  /** Shown in place of a blank table body when `rows` is empty. */
  emptyState?: RegisterEmptyState;
};

export type RegisterViewHubIcon = 'wallet' | 'credit-card' | 'boxes' | 'bar-chart-3';

export type RegisterViewConfig = {
  id: string;
  /** Source register key, e.g. 'inventory.stock_balance'. Informational. */
  register: string;
  title: LocalizedLabel;
  /** Localized secondary line shown next to the count in the topbar
   *  subtitle. Variant-9 mockup ships RU; configs supply per-locale
   *  variants and the renderer picks via the current locale. */
  subtitleSecondary: LocalizedLabel;
  /** Localized "{n} müşteri / {n} складов / …" — depends on count value. */
  countLabel: (count: number) => LocalizedLabel;
  breadcrumb: LocalizedLabel;
  hubCard: {
    icon: RegisterViewHubIcon;
    description: LocalizedLabel;
  };
  topbar: {
    periodPicker: 'month' | 'day' | 'range' | false;
    exportButton: boolean;
  };
  search: { placeholder: LocalizedLabel } | false;
  columns: RegisterColumn[];
  loader: (ctx: RegisterViewCtx) => Promise<RegisterViewPayload>;
  permissions?: { read: 'tenant' };
  /** When true, the shell renders a working page-number pager (driven by
   *  `?page=`) and passes `ctx.page` to the loader, which must slice its rows
   *  by page. Leave false/undefined for summary/matrix views. */
  paginated?: boolean;
};

const viewRegistry = new Map<string, RegisterViewConfig>();
const orderRegistry: { value: string[] | null } = { value: null };

export function defineRegisterView(config: RegisterViewConfig): void {
  // HMR-safe: replace existing entry instead of throwing. Same id with a
  // different config is expected in dev when Turbopack re-evaluates the
  // configs module after an edit. Production loads configs once.
  viewRegistry.set(config.id, config);
}

export function defineRegisterOrder(order: string[]): void {
  orderRegistry.value = order;
}

export function getRegisterViewRegistry(): {
  views: Map<string, RegisterViewConfig>;
  order: string[] | null;
} {
  return { views: viewRegistry, order: orderRegistry.value };
}

/** Test-only helper to reset registry state between cases. */
export function clearRegisterViewRegistry(): void {
  viewRegistry.clear();
  orderRegistry.value = null;
}
