/**
 * `/api/v1/invoices` — public API for sales invoices.
 *
 * GET   — paged list via `listDocumentsPaged(salesInvoiceConfig)`. Header
 *         shape only (matches `/api/v1/products` list semantics — clients
 *         hit `/api/v1/invoices/{id}` for lines).
 * POST  — Zod-validated create that resolves defaults (warehouse, line
 *         prices), persists via `createDocument`, auto-posts via
 *         `postDocument`, and re-reads the POSTED document so the response
 *         reflects the final status. Writes an `api_create` audit entry.
 *
 * Eager `@/configs` import seeds the document registry — without it the
 * route file loaded in isolation (e.g. during a cold serverless invocation)
 * would see an empty `getRegistry().document` map.
 */

import '@/configs';

import { z } from 'zod';

import type { AppContext } from '@/platform/auth/current-context';
import { ApiKeyAuthError } from '@/platform/auth/resolve-api-key';
import { withTenant } from '@/platform/db/tenant-context';
import {
  InvalidStatusError,
  NotFoundError,
  PeriodClosedError,
  PermissionDeniedError,
  PlanLimitError,
  PostingValidationError,
  createDocument,
  getDocument,
  listDocumentsPaged,
  postDocument,
  safeErrorMessage,
  writeAudit,
} from '@/platform/engine';
import { resolvePrice } from '@/platform/engine/pricing';
import type { AccumulationRegisterConfig, DocumentConfig } from '@/platform/metadata';
import { getRegistry } from '@/platform/metadata';

import { requireApiKey } from '../_lib/auth';
import { respondData, respondError } from '../_lib/respond';
import { serializeRow } from '../_lib/serialize';

export const dynamic = 'force-dynamic';

const INVOICE_CONFIG_ID = 'sales.invoice';
const MAX_PAGE_SIZE = 100;
const DEFAULT_PAGE_SIZE = 50;

const listQuerySchema = z.object({
  page: z.coerce.number().int().positive().optional(),
  pageSize: z.coerce.number().int().positive().max(MAX_PAGE_SIZE).optional(),
  search: z.string().optional(),
  status: z.enum(['SAVED', 'POSTED']).optional(),
  // `updatedSince=<ISO8601>` incremental-sync filter — lets 1C pull only
  // invoices changed since the last sync watermark.
  updatedSince: z.string().datetime().optional(),
});

const lineSchema = z.object({
  productId: z.string().uuid(),
  quantity: z.number().positive(),
  priceTypeId: z.string().uuid().optional(),
  unitPrice: z.number().nonnegative().optional(),
});

const createInvoiceSchema = z.object({
  customerId: z.string().uuid(),
  warehouseId: z.string().uuid().optional(),
  priceTypeId: z.string().uuid().optional(),
  date: z.string().datetime().optional(),
  // `externalId` accepted for forward-compat with the spec — the document
  // config doesn't (yet) declare a column for it, so we silently drop it
  // after Zod has rejected non-string shapes. Adding the column requires a
  // migration + DSL change that is out of T3.3 scope.
  externalId: z.string().optional(),
  lines: z.array(lineSchema).min(1),
});

type CreateInvoicePayload = z.infer<typeof createInvoiceSchema>;
type LinePayload = z.infer<typeof lineSchema>;

function resolveInvoiceConfig(): DocumentConfig | null {
  return getRegistry().document[INVOICE_CONFIG_ID] ?? null;
}

function serializeLine(row: Record<string, unknown>): Record<string, unknown> {
  return serializeRow(row);
}

/**
 * Pull lines out of the engine-shaped doc and flatten to the public-API
 * envelope: `{ ...header, lines: [...] }`. The engine returns lines as a
 * section dict (`lines.items: [...]`), but our consumers only see a single
 * section so we expose a flat array.
 */
function serializeInvoice(doc: Record<string, unknown>): Record<string, unknown> {
  const { lines, ...rest } = doc;
  const items =
    lines && typeof lines === 'object' && !Array.isArray(lines)
      ? ((lines as Record<string, unknown[]>).items ?? [])
      : [];
  const header = serializeRow(rest as Record<string, unknown>);
  return {
    ...header,
    lines: items.map((l) => serializeLine(l as Record<string, unknown>)),
  };
}

/**
 * Resolve the tenant's "default warehouse" — the unique non-deleted row
 * when exactly one warehouse exists. Mirrors `resolveWarehouseDefaults`
 * from the document wizard. Returns null for multi-warehouse tenants;
 * the caller surfaces that as a 422.
 */
async function resolveDefaultWarehouseId(ctx: AppContext): Promise<string | null> {
  if (!ctx.tenant) return null;
  return await withTenant(ctx.tenant.id, async (tx) => {
    const bag = tx as unknown as {
      catalog_inventory_warehouse: {
        findMany: (a: unknown) => Promise<Array<{ id: string }>>;
      };
    };
    const rows = await bag.catalog_inventory_warehouse.findMany({
      where: { deletedAt: null },
      select: { id: true },
      take: 2,
    });
    return rows.length === 1 ? (rows[0]?.id ?? null) : null;
  });
}

type CustomerRow = { id: string; defaultPriceType: string | null };

async function loadCustomer(ctx: AppContext, customerId: string): Promise<CustomerRow | null> {
  if (!ctx.tenant) return null;
  return await withTenant(ctx.tenant.id, async (tx) => {
    const bag = tx as unknown as {
      catalog_sales_customer: {
        findUnique: (a: unknown) => Promise<CustomerRow | null>;
      };
    };
    return bag.catalog_sales_customer.findUnique({
      where: { id: customerId },
      select: { id: true, defaultPriceType: true },
    });
  });
}

type ResolvedLine = { product: string; quantity: number; price: number };

/**
 * Resolve each incoming line into an engine-ready shape with a concrete
 * `price`. The fallback chain mirrors the sales-invoice wizard:
 *
 *   1. `unitPrice` provided → use verbatim.
 *   2. Otherwise call `resolvePrice` with the effective priceTypeId
 *      (line.priceTypeId ?? body.priceTypeId ?? customer.defaultPriceType).
 *   3. If the resolver returns a price (any non-null), use it.
 *   4. If still null → 422 `validation_error`.
 *
 * We reuse the existing
 * `resolvePrice` helper rather than rolling a new resolver here.
 */
async function resolveLinePrices(
  ctx: AppContext,
  body: CreateInvoicePayload,
  customer: CustomerRow,
  date: Date,
): Promise<{ ok: true; lines: ResolvedLine[] } | { ok: false; index: number; reason: string }> {
  if (!ctx.tenant) return { ok: false, index: -1, reason: 'no_tenant' };
  const stockRegister = getRegistry().register['inventory.stock_balance'] as
    | AccumulationRegisterConfig
    | undefined;

  const out: ResolvedLine[] = [];
  const tenantId = ctx.tenant.id;

  for (let i = 0; i < body.lines.length; i++) {
    const line = body.lines[i] as LinePayload;
    if (line.unitPrice !== undefined) {
      out.push({ product: line.productId, quantity: line.quantity, price: line.unitPrice });
      continue;
    }
    if (!stockRegister) {
      return { ok: false, index: i, reason: 'price_resolver_unavailable' };
    }
    const effectiveTypeId =
      line.priceTypeId ?? body.priceTypeId ?? customer.defaultPriceType ?? null;
    const result = await withTenant(tenantId, async (tx) =>
      resolvePrice(tx, stockRegister, {
        tenantId,
        customerId: customer.id,
        productId: line.productId,
        date,
        priceTypeId: effectiveTypeId,
      }),
    );
    const resolved = result.price;
    if (!Number.isFinite(resolved) || resolved < 0) {
      return { ok: false, index: i, reason: 'price_unresolved' };
    }
    out.push({ product: line.productId, quantity: line.quantity, price: resolved });
  }
  return { ok: true, lines: out };
}

/**
 * Convert engine / domain errors into the `/api/v1` error envelope. Mirrors
 * the failure-mode table in §"Error codes" of the design spec. Engine
 * errors carry enough context to discriminate 404 vs 422 vs 402 vs 500.
 */
function handleError(err: unknown): Response {
  if (err instanceof ApiKeyAuthError) {
    return respondError(err.code, err.message, err.status);
  }
  if (err instanceof NotFoundError) {
    return respondError('not_found', err.message, 404);
  }
  if (err instanceof InvalidStatusError) {
    return respondError('validation_error', err.message, 422);
  }
  if (err instanceof PostingValidationError) {
    return respondError('validation_error', err.message, 422);
  }
  if (err instanceof PeriodClosedError) {
    return respondError('validation_error', err.message, 422);
  }
  if (err instanceof PermissionDeniedError) {
    return respondError('forbidden', err.message, 403);
  }
  if (err instanceof PlanLimitError) {
    return respondError('feature_locked', err.message, 402, {
      ...(err.toJSON() as unknown as Record<string, unknown>),
    });
  }
  // Surface validation-y messages from the engine (e.g. "insufficient
  // stock") as 422 when they bubble up from pre-post validators. Anything
  // else is an internal error.
  // Never echo raw err.message (Prisma/internal leak). Surface only known
  // user-safe engine messages; generic for everything else. Finding H3.
  const message = safeErrorMessage(err, 'internal error');
  console.error('GET/POST /api/v1/invoices failed:', err);
  return respondError('internal_error', message, 500);
}

export async function GET(req: Request): Promise<Response> {
  try {
    const ctx = await requireApiKey(req, 'read');
    const config = resolveInvoiceConfig();
    if (!config) {
      return respondError('internal_error', 'invoice config not registered', 500);
    }
    const url = new URL(req.url);
    const parsed = listQuerySchema.safeParse(Object.fromEntries(url.searchParams));
    if (!parsed.success) {
      return respondError('validation_error', 'invalid query', 422, {
        issues: parsed.error.issues,
      });
    }
    const page = parsed.data.page ?? 1;
    const pageSize = parsed.data.pageSize ?? DEFAULT_PAGE_SIZE;
    const result = await listDocumentsPaged(ctx, config, {
      page,
      pageSize,
      search: parsed.data.search,
      status: parsed.data.status,
      ...(parsed.data.updatedSince
        ? { where: { updatedAt: { gte: new Date(parsed.data.updatedSince) } } }
        : {}),
    });
    return respondData(
      result.rows.map((row) => serializeRow(row as Record<string, unknown>)),
      { page: result.page, pageSize: result.pageSize, total: result.total },
    );
  } catch (err) {
    return handleError(err);
  }
}

export async function POST(req: Request): Promise<Response> {
  try {
    const ctx = await requireApiKey(req, 'write');
    const config = resolveInvoiceConfig();
    if (!config) {
      return respondError('internal_error', 'invoice config not registered', 500);
    }

    let raw: unknown;
    try {
      raw = await req.json();
    } catch {
      return respondError('validation_error', 'invalid JSON body', 422);
    }
    const parsed = createInvoiceSchema.safeParse(raw);
    if (!parsed.success) {
      return respondError('validation_error', 'invalid payload', 422, {
        issues: parsed.error.issues,
      });
    }
    const body = parsed.data;

    // Resolve date (default = now) and warehouse (default = sole tenant
    // warehouse when there's exactly one). 422 on ambiguity.
    const docDate = body.date ? new Date(body.date) : new Date();
    let warehouseId = body.warehouseId;
    if (!warehouseId) {
      const resolved = await resolveDefaultWarehouseId(ctx);
      if (!resolved) {
        return respondError(
          'validation_error',
          'warehouseId is required for multi-warehouse tenants',
          422,
        );
      }
      warehouseId = resolved;
    }

    const customer = await loadCustomer(ctx, body.customerId);
    if (!customer) {
      return respondError('not_found', `customer ${body.customerId} not found`, 404);
    }

    const priceOutcome = await resolveLinePrices(ctx, body, customer, docDate);
    if (!priceOutcome.ok) {
      return respondError(
        'validation_error',
        `unable to resolve price for line ${priceOutcome.index}: ${priceOutcome.reason}; supply unitPrice explicitly`,
        422,
        { lineIndex: priceOutcome.index, reason: priceOutcome.reason },
      );
    }

    // Engine expects: header fields + `lines: { <section>: [...] }`.
    const headerPayload: Record<string, unknown> = {
      date: docDate,
      customer: body.customerId,
      warehouse: warehouseId,
      lines: { items: priceOutcome.lines },
    };
    if (body.priceTypeId) headerPayload.priceType = body.priceTypeId;

    const created = await createDocument(ctx, config, headerPayload);
    const createdId = created.id as string;

    // Auto-post. If posting fails the document stays in SAVED — the caller
    // can retry the POST after fixing the underlying issue (e.g. stock).
    await postDocument(ctx, config, createdId);

    // Re-read so the response reflects POSTED status + postedAt/postedBy.
    const finalDoc = await getDocument(ctx, config, createdId);

    await writeAudit(null, ctx, {
      entity: `document.${config.module}.${config.name}`,
      entityId: createdId,
      action: 'api_create',
      after: finalDoc,
    });

    return respondData(serializeInvoice(finalDoc), undefined, 201);
  } catch (err) {
    return handleError(err);
  }
}
