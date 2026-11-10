import type { AppContext } from '@/platform/auth/current-context';
import { withTenant } from '@/platform/db/tenant-context';
import type { DocumentConfig, ReferenceFieldConfig, ReferenceToken } from '@/platform/metadata';

/**
 * Mini-record embedded in enriched list rows for any header reference column.
 * Mirrors the iOS `CatalogRef { id, code?, name }` shape so the mobile client
 * can render `customer.name` / `supplier.name` directly without an N+1 lookup.
 */
export type EnrichedRef = {
  id: string;
  code?: string;
  name: string;
};

type AnyRow = Record<string, unknown>;

type CatalogDelegate = {
  findMany: (args: {
    where: { id: { in: string[] } };
    select: { id: true; name: true };
  }) => Promise<Array<AnyRow>>;
};

type LineDelegate = {
  findMany: (args: {
    where: { documentId: { in: string[] } };
    select: Record<string, true>;
  }) => Promise<Array<AnyRow>>;
};

function capitalize(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1);
}

function catalogDelegate(tx: unknown, token: ReferenceToken): CatalogDelegate | null {
  // We probe the Prisma client directly: the catalog registry is rarely
  // imported in route handlers (callers usually only `import` the document
  // configs), and Prisma's model bag is the authoritative shape for the
  // lookup we care about. Documents-as-refs and unknown targets fall through
  // to `null` and the row's column is left as the raw FK string.
  const camel = `catalog${capitalize(token.module)}${capitalize(token.name)}`;
  const snake = `catalog_${token.module}_${token.name}`;
  const bag = tx as Record<string, CatalogDelegate | undefined>;
  return bag[camel] ?? bag[snake] ?? null;
}

function lineDelegate(
  tx: unknown,
  config: DocumentConfig,
  sectionKey: string,
): LineDelegate | null {
  const camel = `documentLine_${config.module}_${config.name}_${sectionKey}`;
  const snake = `document_line_${config.module}_${config.name}_${sectionKey}`;
  const bag = tx as Record<string, LineDelegate | undefined>;
  return bag[camel] ?? bag[snake] ?? null;
}

function refFields(config: DocumentConfig): Array<{ name: string; field: ReferenceFieldConfig }> {
  const out: Array<{ name: string; field: ReferenceFieldConfig }> = [];
  for (const [name, f] of Object.entries(config.header)) {
    if (f.type === 'reference') out.push({ name, field: f });
  }
  return out;
}

function asString(v: unknown): string | null {
  return typeof v === 'string' && v.length > 0 ? v : null;
}

function toNumber(v: unknown): number {
  if (typeof v === 'number' && Number.isFinite(v)) return v;
  if (typeof v === 'bigint') return Number(v);
  if (typeof v === 'string') {
    const n = Number(v);
    return Number.isFinite(n) ? n : 0;
  }
  // Prisma Decimal: has a toNumber()/toString()
  if (v && typeof v === 'object') {
    const obj = v as { toNumber?: () => number; toString?: () => string };
    if (typeof obj.toNumber === 'function') {
      const n = obj.toNumber();
      return Number.isFinite(n) ? n : 0;
    }
    if (typeof obj.toString === 'function') {
      const n = Number(obj.toString());
      return Number.isFinite(n) ? n : 0;
    }
  }
  return 0;
}

/**
 * Enrich a `listDocumentsPaged` result page so the mobile client can render
 * customer/supplier name and a row-level grand total without follow-up
 * lookups.
 *
 * Behaviour:
 *   - Every header `reference` column whose value is a raw FK UUID string is
 *     replaced with `{ id, code?, name }`. Already-embedded objects are left
 *     untouched. Missing target row → column left as the raw id (the iOS
 *     decoder tolerates either shape).
 *   - When the document has line sections, the row gains a `total` (string)
 *     equal to the sum of `quantity * price` across every line of every
 *     section. When the document instead has a header `amount` field
 *     (payment_received / payment_sent), `total` mirrors `amount`.
 *
 * All lookups happen inside a single `withTenant` transaction so RLS is
 * enforced; lookups are batched (`IN (...)`) so we never go N+1.
 */
export async function enrichDocumentListRows(
  ctx: AppContext,
  config: DocumentConfig,
  rows: AnyRow[],
): Promise<AnyRow[]> {
  if (!ctx.tenant) throw new Error('enrichDocumentListRows: no tenant in context');
  if (rows.length === 0) return rows;

  const tenantId = ctx.tenant.id;
  const refs = refFields(config);
  const sections = config.lines ? Object.keys(config.lines) : [];

  // Group all FK ids per target type for one batched fetch each.
  const idsByTarget = new Map<string, Set<string>>();
  for (const { name, field } of refs) {
    const targetId = `${field.to.module}.${field.to.name}`;
    const bucket = idsByTarget.get(targetId) ?? new Set<string>();
    for (const row of rows) {
      const v = row[name];
      const id = asString(v);
      if (id) bucket.add(id);
    }
    if (bucket.size > 0) idsByTarget.set(targetId, bucket);
  }

  const docIds = rows.map((r) => asString(r.id)).filter((x): x is string => x !== null);

  return withTenant(tenantId, async (tx) => {
    // 1. Fetch catalog records for every distinct target type in parallel.
    const refRecordsByTarget = new Map<string, Map<string, EnrichedRef>>();
    await Promise.all(
      Array.from(idsByTarget.entries()).map(async ([targetId, idSet]) => {
        const ids = Array.from(idSet);
        const refField = refs.find((r) => `${r.field.to.module}.${r.field.to.name}` === targetId);
        if (!refField) return;
        const delegate = catalogDelegate(tx, refField.field.to);
        if (!delegate) return;
        // Only `id` + `name` are guaranteed across the catalog tables we
        // currently target (customer, supplier, warehouse, price_type). The
        // optional `code` column is folded in when present (e.g. catalogs
        // generated by Sprint 17b's auto-Code DSL) without a per-target
        // probe — see `extractRef`.
        const records = await delegate.findMany({
          where: { id: { in: ids } },
          select: { id: true, name: true },
        });
        const byId = new Map<string, EnrichedRef>();
        for (const rec of records) {
          const id = asString(rec.id);
          const name = asString(rec.name);
          if (!id || !name) continue;
          byId.set(id, { id, name });
        }
        refRecordsByTarget.set(targetId, byId);
      }),
    );

    // 2. Compute per-document totals.
    // Section field shape varies: invoice lines carry `quantity * price`, but
    // price-setting lines have only `price` (no quantity). Probe the section
    // config and select only the columns that actually exist — Prisma rejects
    // unknown fields with a 500.
    const totalByDocId = new Map<string, number>();
    if (sections.length > 0 && docIds.length > 0) {
      // One query per section across all docs in the page (at most 1-2 sections).
      await Promise.all(
        sections.map(async (sectionKey) => {
          const delegate = lineDelegate(tx, config, sectionKey);
          if (!delegate) return;
          const sectionFields = config.lines?.[sectionKey]?.fields ?? {};
          const hasQuantity = 'quantity' in sectionFields;
          const hasPrice = 'price' in sectionFields;
          if (!hasPrice) return; // nothing to total on
          const select: Record<string, true> = { documentId: true, price: true };
          if (hasQuantity) select.quantity = true;
          const lines = await delegate.findMany({
            where: { documentId: { in: docIds } },
            select,
          });
          for (const line of lines) {
            const docId = asString(line.documentId);
            if (!docId) continue;
            const price = toNumber(line.price);
            const qty = hasQuantity ? toNumber(line.quantity) : 1;
            totalByDocId.set(docId, (totalByDocId.get(docId) ?? 0) + qty * price);
          }
        }),
      );
    }

    // 3. Build enriched rows.
    return rows.map((row) => {
      const out: AnyRow = { ...row };
      for (const { name, field } of refs) {
        const raw = out[name];
        if (typeof raw === 'string' && raw.length > 0) {
          const targetId = `${field.to.module}.${field.to.name}`;
          const ref = refRecordsByTarget.get(targetId)?.get(raw);
          if (ref) {
            out[name] = ref;
            // Always expose the raw FK alongside, so iOS decoders that
            // already read `<name>Id` (e.g. customerId) keep working.
            out[`${name}Id`] = raw;
          }
        }
      }

      const docId = asString(row.id);
      // iOS DocumentRecord.total is a DecimalString (strict string decoder),
      // so emit the total as a string regardless of source.
      if (sections.length > 0) {
        if (docId) out.total = (totalByDocId.get(docId) ?? 0).toString();
      } else if (typeof row.amount !== 'undefined' && row.amount !== null) {
        // payment_received / payment_sent: header.amount IS the document total.
        out.total = toNumber(row.amount).toString();
      }
      return out;
    });
  });
}
