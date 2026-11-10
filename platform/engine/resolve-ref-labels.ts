import type { AccumulationRegisterConfig, Locale, ReferenceToken } from '@/platform/metadata';
import { getRegistry } from '@/platform/metadata';
import { getCatalogPresentation, getDocumentPresentation } from './presentation';

type LookupDelegate = {
  findMany: (args: unknown) => Promise<Array<Record<string, unknown>>>;
};

type LookupBag = Record<string, LookupDelegate | undefined>;

function lookupDelegate(
  tx: unknown,
  kind: 'catalog' | 'document',
  module: string,
  name: string,
): LookupDelegate | null {
  const key = `${kind}_${module}_${name}`;
  const bag = tx as LookupBag;
  return bag[key] ?? null;
}

function asNonEmptyString(value: unknown): string | null {
  if (typeof value !== 'string') return null;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

function presentationOf(
  ref: ReferenceToken,
  record: Record<string, unknown>,
  locale?: Locale,
): string | null {
  const registry = getRegistry();
  const typeId = `${ref.module}.${ref.name}`;
  const catalog = registry.catalog[typeId];
  if (catalog) return getCatalogPresentation(catalog, record);
  const doc = registry.document[typeId];
  if (doc) return getDocumentPresentation(doc, record, locale);
  // Defensive fallback when the target type isn't registered in this process —
  // happens in route handlers that don't side-effect-import every catalog config.
  // Try the conventional displayable fields before giving up.
  return (
    asNonEmptyString(record.name) ??
    asNonEmptyString(record.title) ??
    asNonEmptyString(record.code) ??
    null
  );
}

/**
 * Resolve ref-typed dimension UUIDs in register-balance `groupKey`s to
 * human-readable presentation strings.
 *
 * Returns an array sized to `rows`. Each element is a `{ [dimName]: label }`
 * map for that row's resolvable refs. Refs that point to deleted or unknown
 * targets are silently omitted. Rows whose `groupKey` carries no ref
 * dimensions get an empty `{}` (the caller may choose to drop these).
 *
 * Lookups are batched per dimension type — at most one `findMany` per ref
 * target — so cost is `O(D)` round-trips, not `O(R * D)`.
 *
 * The caller MUST pass a transaction client opened inside `withTenant(...)`
 * so RLS scopes the lookup to the active tenant. The helper does NOT open
 * its own transaction.
 */
export async function resolveRefLabels(
  tx: unknown,
  register: AccumulationRegisterConfig,
  rows: ReadonlyArray<{ groupKey: Record<string, string> }>,
  opts?: { locale?: Locale },
): Promise<Array<Record<string, string>>> {
  const result: Array<Record<string, string>> = rows.map(() => ({}));
  if (rows.length === 0) return result;

  // Collect, per dimension, the unique set of ids referenced across all rows.
  const idsByDim = new Map<string, Set<string>>();
  for (const [dimName, dim] of Object.entries(register.dimensions)) {
    if (dim.type !== 'reference') continue;
    const bucket = new Set<string>();
    for (const row of rows) {
      const value = row.groupKey[dimName];
      if (typeof value === 'string' && value.length > 0) bucket.add(value);
    }
    if (bucket.size > 0) idsByDim.set(dimName, bucket);
  }
  if (idsByDim.size === 0) return result;

  // One findMany per dimension type — batched.
  const labelsByDim = new Map<string, Map<string, string>>();
  await Promise.all(
    Array.from(idsByDim.entries()).map(async ([dimName, idSet]) => {
      const dim = register.dimensions[dimName];
      if (!dim || dim.type !== 'reference') return;
      const ref = dim.to;
      const registry = getRegistry();
      const typeId = `${ref.module}.${ref.name}`;
      const kind: 'catalog' | 'document' = registry.catalog[typeId]
        ? 'catalog'
        : registry.document[typeId]
          ? 'document'
          : 'catalog';
      const delegate = lookupDelegate(tx, kind, ref.module, ref.name);
      if (!delegate) return;
      const ids = Array.from(idSet);
      const records = await delegate.findMany({ where: { id: { in: ids } } });
      const idLabel = new Map<string, string>();
      for (const record of records) {
        const rid = record.id;
        if (typeof rid !== 'string') continue;
        const label = presentationOf(ref, record, opts?.locale);
        if (label != null && label.length > 0) idLabel.set(rid, label);
      }
      labelsByDim.set(dimName, idLabel);
    }),
  );

  // Assemble per-row label maps.
  for (let i = 0; i < rows.length; i++) {
    const row = rows[i];
    if (!row) continue;
    for (const [dimName, idLabel] of labelsByDim) {
      const id = row.groupKey[dimName];
      if (typeof id !== 'string') continue;
      const label = idLabel.get(id);
      if (label != null) {
        const target = result[i];
        if (target) target[dimName] = label;
      }
    }
  }

  return result;
}
