// Side-effect import seeds the catalog/document/register registry. Without
// it `getRegistry().catalog['sales.customer']` returns undefined and the
// handler 500s with `customer config not registered`. See configs/index.ts.
import '@/configs';

import { ApiKeyAuthError } from '@/platform/auth/current-context';
import { withTenant } from '@/platform/db/tenant-context';
import { writeAudit } from '@/platform/engine/audit-log';
import { createRecord, listRecordsPaged } from '@/platform/engine/crud';
import { getRegistry } from '@/platform/metadata/registry';
import { z } from 'zod';
import { requireApiKey } from '../_lib/auth';
import { parseUpdatedSince, respondData, respondError } from '../_lib/respond';
import { serializeRow } from '../_lib/serialize';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

type CustomerDelegate = {
  findMany: (args: object) => Promise<Array<Record<string, unknown>>>;
  count: (args: object) => Promise<number>;
};

export async function GET(req: Request) {
  try {
    const ctx = await requireApiKey(req, 'read');
    const url = new URL(req.url);
    const page = Math.max(1, Number(url.searchParams.get('page')) || 1);
    const pageSize = Math.min(100, Math.max(1, Number(url.searchParams.get('pageSize')) || 50));
    const search = url.searchParams.get('search') ?? undefined;
    // Explicit-equality filters for integration recipes (Wildberries / Ozon /
    // Kaspi). `search` continues to fuzzy-match `name`; `email` and `phone`
    // are exact-match against the corresponding columns. Recipes need this
    // so they can find an existing customer by buyer contact info before
    // falling back to create.
    const email = url.searchParams.get('email') ?? undefined;
    const phone = url.searchParams.get('phone') ?? undefined;

    // `updatedSince=<ISO8601>` incremental-sync filter for 1C pulls.
    const updatedSince = parseUpdatedSince(url.searchParams.get('updatedSince'));
    if (updatedSince === 'invalid') {
      return respondError('validation_error', 'updatedSince must be an ISO 8601 date-time', 422, {
        param: 'updatedSince',
      });
    }

    const cfg = getRegistry().catalog['sales.customer'];
    if (!cfg) return respondError('internal_error', 'customer config not registered', 500);

    if (email || phone) {
      if (!ctx.tenant) return respondError('internal_error', 'no tenant in context', 500);
      const where: Record<string, unknown> = { deletedAt: null };
      if (email) where.email = email;
      if (phone) where.phone = phone;
      if (updatedSince) where.updatedAt = { gte: updatedSince };
      const { rows, total } = await withTenant(ctx.tenant.id, async (tx) => {
        const delegate = (tx as unknown as Record<string, CustomerDelegate | undefined>)
          .catalog_sales_customer;
        if (!delegate) throw new Error('catalog_sales_customer delegate missing');
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

// Field shape mirrors `configs/sales/catalogs/customer.ts`. `defaultPriceType`
// stores the FK UUID of a `sales.price_type` row; `assignedRepId` stores the
// Clerk user id (not necessarily UUID-formatted), so we accept any non-empty
// string. `name` is the only required field on the catalog and stays required
// here.
const createCustomerSchema = z.object({
  name: z.string().min(1),
  email: z.string().email().optional().nullable(),
  phone: z.string().optional().nullable(),
  notes: z.string().optional().nullable(),
  defaultPriceType: z.string().uuid().optional().nullable(),
  assignedRepId: z.string().min(1).optional().nullable(),
});

export async function POST(req: Request) {
  try {
    const ctx = await requireApiKey(req, 'write');
    const json = await req.json().catch(() => null);
    if (!json) return respondError('validation_error', 'Body must be valid JSON', 422);
    const parsed = createCustomerSchema.safeParse(json);
    if (!parsed.success) {
      return respondError('validation_error', 'Body failed validation', 422, {
        issues: parsed.error.issues,
      });
    }
    const cfg = getRegistry().catalog['sales.customer'];
    if (!cfg) return respondError('internal_error', 'customer config not registered', 500);
    const created = await createRecord(ctx, cfg, parsed.data as Record<string, unknown>);
    await writeAudit(null, ctx, {
      entity: 'catalog.sales.customer',
      entityId: String(created.id),
      action: 'api_create',
      after: created,
    });
    return respondData(serializeRow(created), undefined, 201);
  } catch (e) {
    return handleError(e);
  }
}

function handleError(e: unknown): Response {
  if (e instanceof ApiKeyAuthError) return respondError(e.code, e.message, e.status);
  const msg = (e as Error)?.message ?? 'Unexpected error';
  if (msg.includes('Permission denied') || msg.includes('PermissionDenied')) {
    return respondError('insufficient_scope', msg, 403);
  }
  if (msg.includes('not found') || msg.toLowerCase().includes('notfound')) {
    return respondError('not_found', msg, 404);
  }
  process.stderr.write(`[/api/v1/customers] ${msg}\n`);
  return respondError('internal_error', 'Unexpected error', 500);
}
