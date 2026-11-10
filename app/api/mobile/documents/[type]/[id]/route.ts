import '@/configs/purchases/documents/payment-sent';
import '@/configs/purchases/documents/purchase-invoice';
import '@/configs/sales/documents/payment-received';
import '@/configs/sales/documents/sales-invoice';

import { requireTenantContext } from '@/platform/auth/current-context';
import { withTenant } from '@/platform/db/tenant-context';
import { getDocument, updateDocument } from '@/platform/engine';
import { enrichDocumentListRows } from '@/platform/engine/document-list-enrich';
import { redactFinancialFields } from '@/platform/engine/redact-financial';
import { getRegistry } from '@/platform/metadata';
import { DocumentTypeParamSchema } from '@ishflow/mobile-api-contract';
import { NextResponse } from 'next/server';
import { normalizeMobileDocPayload } from '../_payload';
import { type RawDoc } from './dto';

export const dynamic = 'force-dynamic';

type AnyRow = Record<string, unknown>;

/** Coerce Prisma `Int` / `Decimal` / number / numeric-string into a stable
 *  numeric. Returns 0 on unparseable input — line totals downstream stay
 *  finite even when a row is malformed. */
function toNumber(v: unknown): number {
  if (typeof v === 'number' && Number.isFinite(v)) return v;
  if (typeof v === 'bigint') return Number(v);
  if (typeof v === 'string') {
    const n = Number(v);
    return Number.isFinite(n) ? n : 0;
  }
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

/** Money formatter that preserves cents and avoids scientific notation. */
function decimalString(n: number): string {
  return n.toFixed(2);
}

/** Resolve the inventory.product Prisma delegate by probing the camel and
 *  snake variants, returning null if neither is registered. Mirrors the
 *  existing `lineDelegate` / `catalogDelegate` discovery pattern in
 *  document-list-enrich.ts. */
function productDelegate(tx: unknown): {
  findMany: (args: {
    where: { id: { in: string[] } };
    select: { id: true; code: true; name: true };
  }) => Promise<Array<AnyRow>>;
} | null {
  const camel = 'catalogInventoryProduct';
  const snake = 'catalog_inventory_product';
  const bag = tx as Record<string, unknown>;
  return (bag[camel] ?? bag[snake] ?? null) as {
    findMany: (args: {
      where: { id: { in: string[] } };
      select: { id: true; code: true; name: true };
    }) => Promise<Array<AnyRow>>;
  } | null;
}

/** Reshape a raw line row from the engine (`{ product, quantity, price, ...}`)
 *  into the wire shape the iOS `DocumentLine` decoder expects:
 *  `{ id, productId, product?, quantity, unitPrice, rowTotal }`. */
function normalizeLine(row: AnyRow, productMap: Map<string, AnyRow>): AnyRow {
  const productId = typeof row.product === 'string' ? row.product : null;
  const quantity = toNumber(row.quantity);
  const unitPrice = toNumber(row.price);
  const rowTotal = quantity * unitPrice;
  const out: AnyRow = {
    id: row.id,
    productId: productId ?? '',
    quantity: decimalString(quantity),
    unitPrice: decimalString(unitPrice),
    rowTotal: decimalString(rowTotal),
  };
  if (productId) {
    const lookup = productMap.get(productId);
    if (lookup) {
      out.product = {
        id: String(lookup.id),
        code: typeof lookup.code === 'string' ? lookup.code : null,
        name: typeof lookup.name === 'string' ? lookup.name : '',
      };
    }
  }
  return out;
}

export async function GET(
  _req: Request,
  ctx: { params: Promise<{ type: string; id: string }> },
): Promise<Response> {
  const { type, id } = await ctx.params;
  const parsed = DocumentTypeParamSchema.safeParse(type);
  if (!parsed.success) return NextResponse.json({ error: 'invalid type' }, { status: 400 });
  const config = getRegistry().document[parsed.data];
  if (!config) return NextResponse.json({ error: 'unknown type' }, { status: 404 });

  let app: Awaited<ReturnType<typeof requireTenantContext>>;
  try {
    app = await requireTenantContext();
  } catch {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  const doc = (await getDocument(app, config, id)) as RawDoc;
  if (!doc) return NextResponse.json({ error: 'not found' }, { status: 404 });

  // Reuse the list endpoint's enrichment so the detail row gains the same
  // embedded `{id, name}` ref objects (customer, supplier, warehouse,
  // priceType) and computed `total` that the list view already enjoys.
  // Run on a 1-row array; the helper batches and short-circuits cleanly.
  const [enriched] = await enrichDocumentListRows(app, config, [doc as AnyRow]);

  // The engine layer returns `lines` as a section-keyed dict
  // (e.g. `{ items: [...] }`) so multi-section documents can be edited
  // section-by-section. iOS DocumentRecord decodes `lines` as a flat
  // [DocumentLine] — flatten here in section order so the mobile wire shape
  // matches. Web/admin callers use `getDocument` directly and are unaffected.
  const out: AnyRow = { ...enriched };
  if (doc.lines && typeof doc.lines === 'object' && !Array.isArray(doc.lines)) {
    const sectioned = doc.lines as Record<string, unknown[]>;
    const flat = Object.values(sectioned).flat() as AnyRow[];

    // Batch-resolve product refs so each line carries `{ id, code, name }`
    // alongside the raw `productId`. iOS renders `line.product?.name` so
    // this avoids per-line N+1 lookups on the client.
    const productIds = Array.from(
      new Set(
        flat
          .map((r) => (typeof r.product === 'string' ? r.product : null))
          .filter((v): v is string => v !== null && v.length > 0),
      ),
    );
    const productMap = new Map<string, AnyRow>();
    if (productIds.length > 0) {
      const rows = await withTenant(app.tenant.id, async (tx) => {
        const delegate = productDelegate(tx);
        if (!delegate) return [] as AnyRow[];
        return delegate.findMany({
          where: { id: { in: productIds } },
          select: { id: true, code: true, name: true },
        });
      });
      for (const row of rows) productMap.set(String(row.id), row);
    }

    out.lines = flat.map((row) => normalizeLine(row, productMap));
  }

  // Payment kinds carry two text columns iOS otherwise can't surface:
  // - `note`: free-form remark; alias to `comment` so DocumentDetailContent
  //   renders it without a custom CodingKey on the iOS side.
  // - `linkedInvoices`: JSON-encoded `[{invoiceId, amount}]`. Resolve each
  //   id to `{number, date}` so the detail screen can show which invoices
  //   the payment covered, with the amount applied per invoice.
  if (parsed.data === 'sales.payment_received' || parsed.data === 'purchases.payment_sent') {
    if (typeof out.note === 'string' && (out.comment === undefined || out.comment === null)) {
      out.comment = out.note;
    }
    const rawLinked = (out as { linkedInvoices?: unknown }).linkedInvoices;
    if (typeof rawLinked === 'string' && rawLinked.length > 0) {
      let parsedLinked: Array<{ invoiceId: string; amount: number }> = [];
      try {
        const arr = JSON.parse(rawLinked);
        if (Array.isArray(arr)) {
          parsedLinked = arr.filter(
            (i): i is { invoiceId: string; amount: number } =>
              i && typeof i.invoiceId === 'string' && typeof i.amount === 'number',
          );
        }
      } catch {
        parsedLinked = [];
      }
      const ids = parsedLinked.map((p) => p.invoiceId);
      const invoiceTable =
        parsed.data === 'sales.payment_received'
          ? 'document_sales_invoice'
          : 'document_purchases_invoice';
      const lookup = new Map<string, { number: string; date: Date }>();
      if (ids.length > 0) {
        const rows = await withTenant(app.tenant.id, async (tx) => {
          const bag = tx as unknown as Record<
            string,
            {
              findMany: (args: unknown) => Promise<
                Array<{ id: string; number: string; date: Date }>
              >;
            }
          >;
          const delegate = bag[invoiceTable];
          if (!delegate) return [] as Array<{ id: string; number: string; date: Date }>;
          return delegate.findMany({
            where: { id: { in: ids } },
            select: { id: true, number: true, date: true },
          });
        });
        for (const row of rows) lookup.set(row.id, { number: row.number, date: row.date });
      }
      out.linkedInvoices = parsedLinked.map((p) => {
        const inv = lookup.get(p.invoiceId);
        return {
          invoiceId: p.invoiceId,
          invoiceNumber: inv?.number ?? null,
          invoiceDate: inv?.date.toISOString() ?? null,
          amount: decimalString(p.amount),
        };
      });
    } else {
      out.linkedInvoices = [];
    }
  }

  return NextResponse.json(redactFinancialFields(out, app));
}

/**
 * Update an existing SAVED / DRAFT document in place. Mirrors POST's payload
 * normalization (mobile `<ref>Id` + `unitPrice` aliasing + single-section
 * line array unwrap) but routes through the engine's `updateDocument`, which
 * diffs lines and rejects updates on POSTED records.
 *
 * Wired up so the Android sales wizard can resume a Saved invoice, edit
 * header / lines, and persist without creating a duplicate. Previously
 * every "Post on edited Saved" path called create + post, leaving the
 * original Saved record orphaned and producing N duplicates per retry.
 *
 * Attachment rebind (POST's `attachmentDraftId` hook) is intentionally
 * skipped here — the wizard binds attachments at creation time, and edits
 * shouldn't re-bind a fresh draftId onto an existing record.
 */
export async function PATCH(
  req: Request,
  ctx: { params: Promise<{ type: string; id: string }> },
): Promise<Response> {
  const { type, id } = await ctx.params;
  const parsed = DocumentTypeParamSchema.safeParse(type);
  if (!parsed.success) return NextResponse.json({ error: 'invalid type' }, { status: 400 });
  const config = getRegistry().document[parsed.data];
  if (!config) return NextResponse.json({ error: 'unknown type' }, { status: 404 });

  let app: Awaited<ReturnType<typeof requireTenantContext>>;
  try {
    app = await requireTenantContext();
  } catch {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  const rawPayload = (await req.json()) as Record<string, unknown>;
  const payload = normalizeMobileDocPayload(rawPayload, config);
  const updated = await updateDocument(app, config, id, payload);

  // Engine returns lines as a section-keyed dict; mobile DocumentRecord
  // decodes a flat array. The wizard only reads `id` from this response,
  // so emit an empty lines array — the follow-up GET / list endpoints will
  // enrich properly.
  const recordOut = { ...updated, lines: [] };
  return NextResponse.json({ id, record: recordOut });
}

