import { documentSlugFromKey, listHrefForDocumentSlug } from '@/lib/v2-shell/document-slug-map';
import type { DocumentConfig, Locale, LocalizedLabel, RowActionSource } from '@/platform/metadata';
import { openBalancesForDocs } from './posted-balance-by-doc';

/**
 * A row's open balance once computed; null when not applicable.
 */
export type OpenBalanceEntry = {
  amount: number;
  original: number;
  currency: string;
};

/**
 * Server-side projection of a row that's enough to evaluate row actions.
 * Callers pass an array of these and get back a parallel array of resolved
 * action lists. Keep the shape lean — we only need the bits the resolver
 * reads.
 */
export type RowActionInput = {
  /** The row's primary id — feeds 'self.id'. */
  id: string;
  /** Status string — checked against `visibleWhen.status`. */
  status?: string;
  /** Header field values keyed by name — feed 'self.field' sources. */
  fields: Record<string, unknown>;
  /** Resolved labels for reference fields keyed by name — feed 'refLabel'. */
  refLabels?: Record<string, string | null>;
};

export type ResolvedRowAction = {
  key: string;
  label: string;
  icon?: string;
  href: string;
};

function pickLabel(label: LocalizedLabel, locale: Locale): string {
  return label[locale] ?? label.en;
}

function statusMatches(want: string | string[] | undefined, got: string | undefined): boolean {
  if (!want) return true;
  if (Array.isArray(want)) return got != null && want.includes(got);
  return got === want;
}

function readSource(
  src: RowActionSource,
  row: RowActionInput,
  openBalance: OpenBalanceEntry | undefined,
): string | null {
  switch (src.source) {
    case 'self.id':
      return row.id;
    case 'self.field': {
      const v = row.fields[src.field];
      return v == null ? null : String(v);
    }
    case 'refLabel': {
      const v = row.refLabels?.[src.field];
      return v ?? null;
    }
    case 'openBalance.original':
      return openBalance ? openBalance.original.toFixed(2) : null;
    case 'openBalance.amount':
      return openBalance ? openBalance.amount.toFixed(2) : null;
  }
}

function newHrefForTargetKey(targetKey: string): string | null {
  const slug = documentSlugFromKey(targetKey);
  if (!slug) return null;
  return `${listHrefForDocumentSlug(slug)}/new`;
}

/**
 * Resolve every rowAction declared on `config` for the given `rows`.
 *
 * - Walks each action's `visibleWhen` predicates (status + open balance).
 * - For predicates that need an open balance, batches a single register
 *   query per (register, action) pair via `openBalancesForDocs`.
 * - Builds a URLSearchParams from the action's `map`, skipping the action
 *   for a row if any required source resolves to null.
 *
 * Returns a Map keyed by row id with the action list to render.
 */
export async function resolveRowActions({
  config,
  rows,
  tenantId,
  locale,
}: {
  config: DocumentConfig;
  rows: RowActionInput[];
  tenantId: string;
  locale: Locale;
}): Promise<Map<string, ResolvedRowAction[]>> {
  const out = new Map<string, ResolvedRowAction[]>();
  if (!config.rowActions || config.rowActions.length === 0 || rows.length === 0) {
    return out;
  }

  // Pre-fetch open balances once per distinct register referenced by any
  // visibleWhen.openBalance OR any map source that reads openBalance.* .
  const registers = new Set<'sales.accounts_receivable' | 'purchases.accounts_payable'>();
  for (const action of config.rowActions) {
    if (action.visibleWhen?.openBalance) {
      registers.add(action.visibleWhen.openBalance.register);
    }
    for (const src of Object.values(action.map)) {
      if (src.source.startsWith('openBalance.')) {
        // Mapping reads open balance but visibleWhen doesn't declare a register
        // — fall back to whichever register visibleWhen declares; if absent,
        // the mapping will resolve to null. Either way the action is skipped
        // for the row. So nothing to do here.
      }
    }
  }

  const balancesByRegister = new Map<string, Map<string, OpenBalanceEntry>>();
  const ids = rows.map((r) => r.id);
  await Promise.all(
    Array.from(registers).map(async (register) => {
      const m = await openBalancesForDocs({ tenantId, register, invoiceIds: ids });
      balancesByRegister.set(register, m);
    }),
  );

  for (const row of rows) {
    const resolved: ResolvedRowAction[] = [];
    for (const action of config.rowActions) {
      if (!statusMatches(action.visibleWhen?.status, row.status)) continue;

      // openBalance predicate
      const obSpec = action.visibleWhen?.openBalance;
      const openBalance = obSpec ? balancesByRegister.get(obSpec.register)?.get(row.id) : undefined;
      if (obSpec) {
        const threshold = obSpec.gt ?? 0;
        if (!openBalance || openBalance.original <= threshold) continue;
      }

      // Build URL
      const targetHref = newHrefForTargetKey(action.target);
      if (!targetHref) continue;

      const params = new URLSearchParams();
      let valid = true;
      for (const [key, src] of Object.entries(action.map)) {
        const v = readSource(src, row, openBalance);
        if (v == null) {
          valid = false;
          break;
        }
        params.set(key, v);
      }
      if (!valid) continue;

      resolved.push({
        key: action.key,
        label: pickLabel(action.label, locale),
        icon: action.icon,
        href: `${targetHref}?${params.toString()}`,
      });
    }
    if (resolved.length > 0) out.set(row.id, resolved);
  }

  return out;
}
