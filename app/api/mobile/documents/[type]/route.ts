import '@/configs/purchases/documents/payment-sent';
import '@/configs/purchases/documents/purchase-invoice';
import '@/configs/sales/documents/payment-received';
import '@/configs/sales/documents/sales-invoice';

import { requireTenantContext } from '@/platform/auth/current-context';
import { withTenant } from '@/platform/db/tenant-context';
import {
  createDocument,
  listDocumentsPaged,
  resolveIdempotency,
  safeErrorMessage,
  storeIdempotency,
} from '@/platform/engine';
import { enrichDocumentListRows } from '@/platform/engine/document-list-enrich';
import { redactFinancialFields } from '@/platform/engine/redact-financial';
import { getRegistry } from '@/platform/metadata';
import { DocumentListQuerySchema, DocumentTypeParamSchema } from '@ishflow/mobile-api-contract';
import { NextResponse } from 'next/server';
import { normalizeMobileDocPayload } from './_payload';

export const dynamic = 'force-dynamic';

function resolveDoc(type: string) {
  return getRegistry().document[type];
}

type ParsedListQuery = {
  from?: string;
  to?: string;
  customerIds?: string[];
  supplierIds?: string[];
  productIds?: string[];
};

/** Translate parsed list-query filters to a Prisma `where` fragment.
 * - `from`/`to` map to header `date` if the config has it.
 * - `customerIds` map to header `customerId` (only sales-side configs).
 * - `supplierIds` map to header `supplierId` (only purchase-side configs).
 * - `productIds` map to a relational predicate on the lines table; only
 *   applied when the config has lines AND the line table has `productId`.
 */
function buildFilterWhere(
  config: ReturnType<typeof resolveDoc>,
  q: ParsedListQuery,
): Record<string, unknown> {
  if (!config) return {};
  const where: Record<string, unknown> = {};

  // Date range on header.date
  const hasDate = 'date' in (config.header ?? {});
  if (hasDate && (q.from || q.to)) {
    const dateRange: Record<string, Date> = {};
    if (q.from) dateRange.gte = new Date(q.from);
    // Inclusive upper bound: end of day
    if (q.to) {
      const end = new Date(q.to);
      end.setUTCHours(23, 59, 59, 999);
      dateRange.lte = end;
    }
    where.date = dateRange;
  }

  // customerIds → customerId in (...)
  if (q.customerIds && q.customerIds.length > 0 && 'customer' in (config.header ?? {})) {
    where.customerId = { in: q.customerIds };
  }

  // supplierIds → supplierId in (...)
  if (q.supplierIds && q.supplierIds.length > 0 && 'supplier' in (config.header ?? {})) {
    where.supplierId = { in: q.supplierIds };
  }

  // productIds → lines.some.productId in (...)
  // Only applies if the config has lines AND the line block has a `product` ref field.
  const lines = config.lines;
  if (q.productIds && q.productIds.length > 0 && lines) {
    // Lines come in named groups (e.g. `items`); we filter on any line group
    // that has a `product` field. The Prisma relation name matches the line
    // group name (engine convention).
    for (const [groupName, group] of Object.entries(lines)) {
      const fields = (group as { fields?: Record<string, unknown> }).fields ?? {};
      if ('product' in fields) {
        where[groupName] = { some: { productId: { in: q.productIds } } };
        break; // Only one product-bearing line group per doc today.
      }
    }
  }

  return where;
}

export async function GET(
  req: Request,
  ctx: { params: Promise<{ type: string }> },
): Promise<Response> {
  const { type } = await ctx.params;
  const parsed = DocumentTypeParamSchema.safeParse(type);
  if (!parsed.success) return NextResponse.json({ error: 'invalid type' }, { status: 400 });
  const config = resolveDoc(parsed.data);
  if (!config) return NextResponse.json({ error: 'unknown type' }, { status: 404 });

  let app: Awaited<ReturnType<typeof requireTenantContext>>;
  try {
    app = await requireTenantContext();
  } catch {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  const url = new URL(req.url);
  const q = DocumentListQuerySchema.safeParse(Object.fromEntries(url.searchParams));
  if (!q.success) return NextResponse.json({ error: 'invalid query' }, { status: 400 });

  const { page, pageSize, status } = q.data;
  const engineStatus = status === 'SAVED' || status === 'POSTED' ? status : undefined;
  const since = url.searchParams.get('since');
  const filterWhere = buildFilterWhere(config, q.data);
  const baseWhere: Record<string, unknown> = since
    ? { updatedAt: { gte: new Date(since) }, ...filterWhere }
    : filterWhere;
  const result = await listDocumentsPaged(app, config, {
    page,
    pageSize,
    search: q.data.q,
    status: engineStatus,
    where: Object.keys(baseWhere).length > 0 ? baseWhere : undefined,
  });

  // Embed `{id, code?, name}` for every header reference column + row `total` so iOS lists
  // can render customer.name + amount without N+1 lookups. Batched, stays inside withTenant.
  const enriched = await enrichDocumentListRows(app, config, result.rows);

  // Apply financial-field redaction for warehouse-scoped reads
  const redacted = enriched.map((row) => redactFinancialFields(row, app));

  // Don't Zod-parse our own response: Prisma rows carry `Date` instances which
  // `z.string().datetime()` rejects. JSON.stringify already emits ISO strings.
  return NextResponse.json({
    items: redacted,
    total: result.total,
    page: result.page,
    pageSize: result.pageSize,
  });
}

export async function POST(
  req: Request,
  ctx: { params: Promise<{ type: string }> },
): Promise<Response> {
  const { type } = await ctx.params;
  const parsed = DocumentTypeParamSchema.safeParse(type);
  if (!parsed.success) return NextResponse.json({ error: 'invalid type' }, { status: 400 });
  const config = resolveDoc(parsed.data);
  if (!config) return NextResponse.json({ error: 'unknown type' }, { status: 404 });

  let app: Awaited<ReturnType<typeof requireTenantContext>>;
  try {
    app = await requireTenantContext();
  } catch {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  const idempotencyKey = req.headers.get('Idempotency-Key');
  if (!idempotencyKey) {
    return NextResponse.json({ error: 'Idempotency-Key header required' }, { status: 400 });
  }
  const existing = await resolveIdempotency(app.tenant.id, idempotencyKey).catch(() => null);
  if (existing && existing.resourceType === config.id) {
    return NextResponse.json(existing.responseBody, { status: existing.statusCode });
  }

  const rawPayload = (await req.json()) as Record<string, unknown>;

  // Strip attachmentDraftId before passing to engine — it's a wizard-side
  // hint for post-create attachment rebind, not a document field.
  const attachmentDraftId =
    typeof rawPayload.attachmentDraftId === 'string' ? rawPayload.attachmentDraftId : null;
  const payloadWithoutDraftId: Record<string, unknown> = { ...rawPayload };
  delete payloadWithoutDraftId.attachmentDraftId;

  let created: Awaited<ReturnType<typeof createDocument>>;
  try {
    const payload = normalizeMobileDocPayload(payloadWithoutDraftId, config);
    created = await createDocument(app, config, payload);
  } catch (err) {
    // A failed create is almost always a bad/incomplete payload (e.g. a
    // required reference the mobile form didn't send). Surface a 400 with a
    // message instead of an empty 500 so the client can show a useful error.
    console.error(`[mobile create ${config.id}] failed`, err);
    // Only surface developer-authored, user-safe engine messages; never raw
    // Prisma/internal text. Finding H3.
    const message = safeErrorMessage(err, 'create failed');
    return NextResponse.json({ error: 'create_failed', message }, { status: 400 });
  }

  // If the wizard captured attachments under a client-generated draftId,
  // rebind them to the freshly-created document id. Idempotent (updateMany
  // is harmless if no rows match — e.g. retried request after success).
  if (attachmentDraftId) {
    await withTenant(app.tenant.id, async (tx) =>
      tx.attachment.updateMany({
        where: {
          tenantId: app.tenant.id,
          entity: `document.${config.id}`,
          entityId: attachmentDraftId,
        },
        data: { entityId: created.id as string },
      }),
    );
  }

  // The engine returns `lines` as a section-keyed dict (`{ items: [...] }`),
  // but iOS DocumentRecord declares `lines: [DocumentLine]?` and refuses to
  // decode the dict shape. The wizard's create flow only reads `id` from
  // this response, so emit an empty lines array — the follow-up GET / list
  // endpoints enrich properly through `enrichDocumentListRows`.
  const recordOut = { ...created, lines: [] };

  const body = {
    id: created.id as string,
    record: recordOut,
  };

  await storeIdempotency(app.tenant.id, idempotencyKey, {
    resourceType: config.id,
    resourceId: created.id as string,
    responseBody: body,
    statusCode: 201,
  });

  return NextResponse.json(body, { status: 201 });
}
