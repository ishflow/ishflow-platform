/**
 * Public API — `/api/v1/products`
 *
 * - GET  → paginated list (search/page/pageSize), `read` scope.
 * - POST → create one product, `write` scope. Audits with `api_create`.
 *
 * Conforms to the JSON envelope defined in
 * the internal design spec. Errors are
 * normalised through `handleError` → `respondError`.
 *
 * The `import '@/configs/inventory/catalogs/product'` side-effect ensures the
 * product config is registered with the metadata registry even when this
 * route is the first thing a cold serverless instance touches.
 */

import '@/configs/inventory/catalogs/product';

import { z } from 'zod';

import { ApiKeyAuthError } from '@/platform/auth/current-context';
import { withTenant } from '@/platform/db/tenant-context';
import { writeAudit } from '@/platform/engine/audit-log';
import { createRecord, listRecordsPaged } from '@/platform/engine/crud';
import {
  NotFoundError,
  PermissionDeniedError,
  ViewAsReadOnlyError,
} from '@/platform/engine/errors';
import { getRegistry } from '@/platform/metadata/registry';

import { requireApiKey } from '../_lib/auth';
import { parseUpdatedSince, respondData, respondError } from '../_lib/respond';
import { serializeRow } from '../_lib/serialize';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

const PRODUCT_CONFIG_ID = 'inventory.product';

type ProductDelegate = {
  findMany: (args: object) => Promise<Array<Record<string, unknown>>>;
  count: (args: object) => Promise<number>;
};

export async function GET(req: Request): Promise<Response> {
  try {
    const ctx = await requireApiKey(req, 'read');
    const url = new URL(req.url);
    const page = Math.max(1, Number(url.searchParams.get('page')) || 1);
    const pageSize = Math.min(100, Math.max(1, Number(url.searchParams.get('pageSize')) || 50));
    const search = url.searchParams.get('search') ?? undefined;
    // Explicit-equality filters added for marketplace integration recipes:
    // `barcode` (Wildberries) and `code` (Ozon SKU, Kaspi offer code). The
    // existing `search` continues to fuzzy-match the product name.
    const barcode = url.searchParams.get('barcode') ?? undefined;
    const code = url.searchParams.get('code') ?? undefined;

    // `updatedSince=<ISO8601>` incremental-sync filter — lets 1C pull only
    // rows changed since the last sync watermark.
    const updatedSince = parseUpdatedSince(url.searchParams.get('updatedSince'));
    if (updatedSince === 'invalid') {
      return respondError('validation_error', 'updatedSince must be an ISO 8601 date-time', 422, {
        param: 'updatedSince',
      });
    }

    const cfg = getRegistry().catalog[PRODUCT_CONFIG_ID];
    if (!cfg) {
      return respondError('internal_error', 'product config not registered', 500);
    }

    if (barcode || code) {
      if (!ctx.tenant) return respondError('internal_error', 'no tenant in context', 500);
      const where: Record<string, unknown> = { deletedAt: null };
      if (barcode) where.barcode = barcode;
      if (code) where.code = code;
      if (updatedSince) where.updatedAt = { gte: updatedSince };
      const { rows, total } = await withTenant(ctx.tenant.id, async (tx) => {
        const delegate = (tx as unknown as Record<string, ProductDelegate | undefined>)
          .catalog_inventory_product;
        if (!delegate) throw new Error('catalog_inventory_product delegate missing');
        const [rows, total] = await Promise.all([
          delegate.findMany({
            where,
            orderBy: [{ updatedAt: 'desc' }],
            skip: (page - 1) * pageSize,
            take: pageSize,
          }),
          delegate.count({ where }),
        ]);
        return { rows, total };
      });
      return respondData(
        rows.map((r) => serializeRow(r)),
        { page, pageSize, total },
      );
    }

    const { rows, total } = await listRecordsPaged(ctx, cfg, {
      page,
      pageSize,
      search,
      ...(updatedSince ? { where: { updatedAt: { gte: updatedSince } } } : {}),
    });
    return respondData(
      rows.map((r) => serializeRow(r)),
      { page, pageSize, total },
    );
  } catch (e) {
    return handleError(e);
  }
}

/**
 * Inbound body schema. Mirrors `configs/inventory/catalogs/product.ts` fields;
 * `code` is server-generated when omitted (autoGenerate=sequence) so callers
 * may leave it unset.
 *
 * By project convention, Zod is used ONLY on the
 * inbound payload — never on the outbound response shape.
 */
const createProductSchema = z.object({
  name: z.string().min(1),
  code: z.string().optional(),
  categoryId: z.string().uuid().optional().nullable(),
  groupId: z.string().uuid().optional().nullable(),
  barcode: z.string().optional(),
});

export async function POST(req: Request): Promise<Response> {
  try {
    const ctx = await requireApiKey(req, 'write');

    const json = await req.json().catch(() => null);
    if (json === null) {
      return respondError('validation_error', 'Body must be valid JSON', 422);
    }

    const parsed = createProductSchema.safeParse(json);
    if (!parsed.success) {
      return respondError('validation_error', 'Body failed validation', 422, {
        issues: parsed.error.issues,
      });
    }

    const cfg = getRegistry().catalog[PRODUCT_CONFIG_ID];
    if (!cfg) {
      return respondError('internal_error', 'product config not registered', 500);
    }

    const created = await createRecord(ctx, cfg, parsed.data as Record<string, unknown>);

    // Best-effort audit; `writeAudit` swallows its own failures (own tx).
    await writeAudit(null, ctx, {
      entity: `catalog.${cfg.module}.${cfg.name}`,
      entityId: String(created.id),
      action: 'api_create',
      after: created,
    });

    return respondData(serializeRow(created), undefined, 201);
  } catch (e) {
    return handleError(e);
  }
}

/**
 * Map engine + auth errors to the public envelope. Order matters:
 * - ApiKeyAuthError carries its own code/status — surface verbatim.
 * - Engine error classes are typed → preferred over message sniffing.
 * - Fallback: log + opaque 500 so we don't leak internals.
 */
function handleError(e: unknown): Response {
  if (e instanceof ApiKeyAuthError) {
    return respondError(e.code, e.message, e.status);
  }
  if (e instanceof PermissionDeniedError || e instanceof ViewAsReadOnlyError) {
    return respondError('insufficient_scope', e.message, 403);
  }
  if (e instanceof NotFoundError) {
    return respondError('not_found', e.message, 404);
  }
  const msg = (e as Error)?.message ?? 'Unexpected error';
  process.stderr.write(`[/api/v1/products] ${msg}\n`);
  return respondError('internal_error', 'Unexpected error', 500);
}
