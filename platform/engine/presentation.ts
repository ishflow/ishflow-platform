import type { AppContext } from '@/platform/auth/current-context';
import { withTenant } from '@/platform/db/tenant-context';
import {
  type CatalogConfig,
  type DocumentConfig,
  type Locale,
  getRegistry,
} from '@/platform/metadata';
import type { Prisma } from '@prisma/client';

const FALLBACK_LABEL = '—';
const SHORT_UUID_LENGTH = 8;

function shortId(record: Record<string, unknown>): string {
  const id = record.id;
  if (typeof id === 'string' && id.length > 0) {
    return id.slice(0, SHORT_UUID_LENGTH);
  }
  return FALLBACK_LABEL;
}

function asNonEmptyString(value: unknown): string | null {
  if (typeof value !== 'string') return null;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

function formatIsoDate(value: unknown): string | null {
  if (value instanceof Date) {
    if (Number.isNaN(value.getTime())) return null;
    return value.toISOString().slice(0, 10);
  }
  if (typeof value === 'string' && value.length > 0) {
    const parsed = new Date(value);
    if (Number.isNaN(parsed.getTime())) return null;
    return parsed.toISOString().slice(0, 10);
  }
  return null;
}

function pickLabel(label: { en: string } & Partial<Record<Locale, string>>, locale?: Locale) {
  if (locale && label[locale]) return label[locale] as string;
  return label.en;
}

export function getCatalogPresentation(
  config: CatalogConfig,
  record: Record<string, unknown>,
): string {
  if (config.presentation) {
    try {
      const out = config.presentation(record);
      if (typeof out === 'string' && out.length > 0) return out;
    } catch {
      // fall through to defaults
    }
  }

  const displayValue = config.displayField ? asNonEmptyString(record[config.displayField]) : null;
  if (displayValue) return displayValue;

  const code = asNonEmptyString(record.code);
  if (code) return code;

  return shortId(record);
}

export function getDocumentPresentation(
  config: DocumentConfig,
  record: Record<string, unknown>,
  locale?: Locale,
): string {
  if (config.presentation) {
    try {
      const out = config.presentation(record);
      if (typeof out === 'string' && out.length > 0) return out;
    } catch {
      // fall through to defaults
    }
  }

  const typeLabel = pickLabel(config.label, locale);
  const number = asNonEmptyString(record.number);
  const dateText = formatIsoDate(record.date);

  if (number && dateText) return `${typeLabel} ${number} — ${dateText}`;
  if (number) return `${typeLabel} ${number}`;
  if (dateText) return `${typeLabel} — ${dateText}`;

  return `${typeLabel} ${shortId(record)}`;
}

export function getPresentation(
  typeId: string,
  record: Record<string, unknown>,
  locale?: Locale,
): string {
  const registry = getRegistry();
  const catalog = registry.catalog[typeId];
  if (catalog) return getCatalogPresentation(catalog, record);
  const doc = registry.document[typeId];
  if (doc) return getDocumentPresentation(doc, record, locale);
  if (typeof record.id === 'string' && record.id.length > 0) {
    return record.id.slice(0, SHORT_UUID_LENGTH);
  }
  return FALLBACK_LABEL;
}

type TxClient = Prisma.TransactionClient;

type PresentationTxBag = Record<
  string,
  | {
      findUnique: (args: unknown) => Promise<Record<string, unknown> | null>;
      findMany: (args: unknown) => Promise<Array<Record<string, unknown>>>;
    }
  | undefined
>;

function presentationDelegate(
  tx: unknown,
  kind: 'catalog' | 'document',
  module: string,
  name: string,
) {
  const key = `${kind}_${module}_${name}`;
  const bag = tx as PresentationTxBag;
  return bag[key] ?? null;
}

function shortFallback(id: string): string {
  if (!id) return FALLBACK_LABEL;
  return id.slice(0, SHORT_UUID_LENGTH);
}

export type PresentationByRefOptions = {
  locale?: Locale;
  tx?: TxClient;
};

/**
 * 1C analog of `ПредставлениеСсылки(Ссылка)`.
 *
 * Resolves a record by `typeId + id` and runs `getPresentation` on it.
 * Degrades gracefully: returns `id.slice(0, 8)` (or `"—"` on empty id) when
 * the type is unknown, the record is missing, or no tenant is on the context.
 * When `opts.tx` is provided, the lookup reuses the caller's transaction;
 * otherwise a fresh `withTenant` is opened for the tenant on `ctx`.
 */
export async function getPresentationByRef(
  ctx: AppContext,
  typeId: string,
  id: string,
  opts?: PresentationByRefOptions,
): Promise<string> {
  if (!id) return FALLBACK_LABEL;

  const registry = getRegistry();
  const catalog = registry.catalog[typeId];
  const doc = registry.document[typeId];
  const config = catalog ?? doc;
  if (!config) return shortFallback(id);

  const kind: 'catalog' | 'document' = catalog ? 'catalog' : 'document';

  const lookup = async (tx: unknown) => {
    const delegate = presentationDelegate(tx, kind, config.module, config.name);
    if (!delegate) return null;
    return delegate.findUnique({ where: { id } });
  };

  let record: Record<string, unknown> | null = null;
  if (opts?.tx) {
    record = await lookup(opts.tx);
  } else {
    if (!ctx.tenant) return shortFallback(id);
    record = await withTenant(ctx.tenant.id, lookup);
  }

  if (!record) return shortFallback(id);
  return getPresentation(typeId, record, opts?.locale);
}

/**
 * Batch variant of `getPresentationByRef`. Returns a `Map<id, presentation>`
 * sized to the deduplicated set of ids — missing/unknown ids get the short
 * fallback so callers don't have to branch.
 */
export async function getPresentationsByRefs(
  ctx: AppContext,
  typeId: string,
  ids: readonly string[],
  opts?: PresentationByRefOptions,
): Promise<Map<string, string>> {
  const result = new Map<string, string>();
  if (ids.length === 0) return result;

  const uniqueIds = [
    ...new Set(ids.filter((x): x is string => typeof x === 'string' && x.length > 0)),
  ];
  if (uniqueIds.length === 0) return result;

  const registry = getRegistry();
  const catalog = registry.catalog[typeId];
  const doc = registry.document[typeId];
  const config = catalog ?? doc;

  if (!config) {
    for (const id of uniqueIds) result.set(id, shortFallback(id));
    return result;
  }

  const kind: 'catalog' | 'document' = catalog ? 'catalog' : 'document';

  const lookup = async (tx: unknown) => {
    const delegate = presentationDelegate(tx, kind, config.module, config.name);
    if (!delegate) return [] as Array<Record<string, unknown>>;
    return delegate.findMany({ where: { id: { in: uniqueIds } } });
  };

  let records: Array<Record<string, unknown>>;
  if (opts?.tx) {
    records = await lookup(opts.tx);
  } else if (!ctx.tenant) {
    for (const id of uniqueIds) result.set(id, shortFallback(id));
    return result;
  } else {
    records = await withTenant(ctx.tenant.id, lookup);
  }

  const byId = new Map<string, Record<string, unknown>>();
  for (const record of records) {
    const rid = record.id;
    if (typeof rid === 'string') byId.set(rid, record);
  }
  for (const id of uniqueIds) {
    const record = byId.get(id);
    result.set(id, record ? getPresentation(typeId, record, opts?.locale) : shortFallback(id));
  }
  return result;
}
