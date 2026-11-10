import type { Prisma } from '@prisma/client';
import type { ReactNode } from 'react';
import type { PeriodSelection } from './register-view';
import type { Locale, LocalizedLabel } from './types';

// Re-export PeriodSelection from register-view so report consumers don't have
// to import from two places. (PeriodSelection is the actual shared shape.)
export type ReportViewCtx = {
  tenant: { id: string; locale: Locale; currency: string };
  /** Transaction client bound to the current tenant via `withTenant`. */
  tx: Prisma.TransactionClient;
  period: PeriodSelection;
  /** Selected chip key (?chip= URL param), or null = "all". */
  chip: string | null;
  /** Search query (?q= URL param), or null. */
  search: string | null;
};

// ────────────────────────────── KPI ──────────────────────────────

export type ReportKpiCard = {
  /** Stable id used in i18n + telemetry. */
  id: string;
  label: LocalizedLabel;
  /** Pre-formatted by the loader (locale-aware money/number). */
  value: string;
  delta?: {
    direction: 'up' | 'down';
    formatted: string;
    note: LocalizedLabel;
  };
  tone?: 'positive' | 'negative' | 'neutral';
};

// ──────────────────────────── Sections ───────────────────────────

export type ReportBreakdownColumn = {
  key: string;
  label: LocalizedLabel;
  align?: 'left' | 'right';
};

export type ReportBreakdownRow = { id: string; cells: ReactNode[] };

export type ReportBreakdownSection = {
  kind: 'breakdown';
  title?: LocalizedLabel;
  /** Optional dimension chip row above the table (filter switch). */
  dimensions?: { key: string; label: LocalizedLabel }[];
  columns: ReportBreakdownColumn[];
  rows: ReportBreakdownRow[];
  totalsRow?: ReactNode[];
};

export type ReportRankedItem = {
  id: string;
  /** 2-letter avatar. */
  initials: string;
  name: string;
  /** Optional sub-line (city, customer count, etc.). */
  meta?: string;
  /** Pre-formatted, locale + currency aware. */
  amount: string;
  /** 0–100. */
  fillPct: number;
  tone?: 'positive' | 'negative' | 'neutral';
};

export type ReportRankedSection = {
  kind: 'ranked';
  title?: LocalizedLabel;
  items: ReportRankedItem[];
};

export type ReportAgingBucket = {
  key: string;
  label: LocalizedLabel;
  value: string;
  count: LocalizedLabel;
  fillPct: number;
  tone: 'ok' | 'warn' | 'danger';
};

export type ReportAgingSection = {
  kind: 'aging';
  buckets: ReportAgingBucket[];
};

export type ReportChartSection = {
  kind: 'chart';
  totalLabel: string;
  changePct: number;
  points: number[];
  labels: string[];
};

export type ReportPnlRow = {
  id: string;
  kind: 'section' | 'leaf' | 'subtotal' | 'total';
  label: LocalizedLabel;
  /** Current-period value, pre-formatted. */
  current: string;
  /** Prior-period value, pre-formatted. */
  prior?: string;
  delta?: { direction: 'up' | 'down'; formatted: string };
  /** Pre-formatted margin (e.g. "34.4%"). Only on subtotal/total rows. */
  margin?: string;
  /** Indentation depth (0 = top-level). */
  depth?: number;
};

export type ReportPnlSection = {
  kind: 'pnl';
  rows: ReportPnlRow[];
};

export type ReportSection =
  | ReportBreakdownSection
  | ReportRankedSection
  | ReportAgingSection
  | ReportChartSection
  | ReportPnlSection;

// ────────────────────────── Top-level payload ────────────────────────

export type ReportChipOption = {
  key: string;
  label: LocalizedLabel;
  count?: number;
};

export type ReportViewPayload = {
  kpis: ReportKpiCard[];
  /** Optional top-level chip row (e.g. sort switch, period band filter). */
  chips?: ReportChipOption[];
  /** Ordered, heterogeneous content sections. */
  sections: ReportSection[];
};

// ──────────────────────────── Hub icon ───────────────────────────

export type ReportHubIcon =
  | 'trending-up'
  | 'wallet'
  | 'wallet-2'
  | 'dollar-sign'
  | 'bar-chart-3'
  | 'alert-triangle'
  | 'boxes'
  | 'credit-card';

// ────────────────────────────── Config ────────────────────────────

export type ReportViewConfig = {
  id: string;
  title: LocalizedLabel;
  /** Localized secondary subtitle shown next to the title (resolved via pickLabel). */
  subtitleSecondary: LocalizedLabel;
  countLabel?: (count: number) => LocalizedLabel;
  breadcrumb: LocalizedLabel;
  /** Hub group header — controls hub grouping (e.g. "Brüt Kâr", "Tablolar"). */
  section: LocalizedLabel;
  hubCard: {
    icon: ReportHubIcon;
    description: LocalizedLabel;
  };
  topbar: {
    periodPicker: 'month' | 'day' | 'range' | 'quarter' | false;
    exportButton: boolean;
  };
  search?: { placeholder: LocalizedLabel };
  loader: (ctx: ReportViewCtx) => Promise<ReportViewPayload>;
  permissions?: { read: 'tenant' };
};

// ──────────────────────────── Registry ────────────────────────────

const reportRegistry = new Map<string, ReportViewConfig>();
const reportOrderRegistry: { value: string[] | null } = { value: null };

/** HMR-safe: replace existing entry on duplicate id. */
export function defineReportView(config: ReportViewConfig): void {
  reportRegistry.set(config.id, config);
}

export function defineReportOrder(order: string[]): void {
  reportOrderRegistry.value = order;
}

export function getReportRegistry(): {
  views: Map<string, ReportViewConfig>;
  order: string[] | null;
} {
  return { views: reportRegistry, order: reportOrderRegistry.value };
}

/** Test-only helper to reset registry state between cases. */
export function clearReportRegistry(): void {
  reportRegistry.clear();
  reportOrderRegistry.value = null;
}
