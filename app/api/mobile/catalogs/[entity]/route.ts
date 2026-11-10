import '@/configs/inventory/catalogs/product';
import '@/configs/inventory/catalogs/product-category';
import '@/configs/inventory/catalogs/product-group';
import '@/configs/inventory/catalogs/warehouse';
import '@/configs/purchases/catalogs/supplier';
import '@/configs/sales/catalogs/customer';
import '@/configs/sales/catalogs/price-type';
import '@/configs/sales/catalogs/price-agreement';

import { requireTenantContext } from '@/platform/auth/current-context';
import { withTenant } from '@/platform/db/tenant-context';
import {
  createRecord,
  listRecordsPaged,
  resolveIdempotency,
  storeIdempotency,
} from '@/platform/engine';
import { redactFinancialFields } from '@/platform/engine/redact-financial';
import { getRegistry } from '@/platform/metadata';
import { CatalogEntityParamSchema, CatalogListQuerySchema } from '@ishflow/mobile-api-contract';
import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

// Mobile slug aliases → canonical catalog IDs.
// iOS picker code shipped with `sales.priceType` (camelCase) before the
// canonical id was finalized as `sales.price_type` (snake_case). Aliasing
// both forms here means we can fix the production iOS app without a
// store-side rebuild.
const MOBILE_CATALOG_ALIASES: Record<string, string> = {
  'prices.priceList': 'sales.price_type',
  'sales.priceType': 'sales.price_type',
};

function resolveConfig(entity: string) {
  const canonicalId = MOBILE_CATALOG_ALIASES[entity] ?? entity;
  return getRegistry().catalog[canonicalId];
}

export async function GET(
  req: Request,
  ctx: { params: Promise<{ entity: string }> },
): Promise<Response> {
  const { entity } = await ctx.params;
  // Resolve mobile aliases before validation
  const aliasedEntity = MOBILE_CATALOG_ALIASES[entity] ?? entity;
  const entityParsed = CatalogEntityParamSchema.safeParse(aliasedEntity);
  if (!entityParsed.success) {
    return NextResponse.json({ error: 'invalid entity' }, { status: 400 });
  }
  const config = resolveConfig(entityParsed.data);
  if (!config) return NextResponse.json({ error: 'unknown entity' }, { status: 404 });

  let app: Awaited<ReturnType<typeof requireTenantContext>>;
  try {
    app = await requireTenantContext();
  } catch {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  const url = new URL(req.url);
  const qParsed = CatalogListQuerySchema.safeParse(Object.fromEntries(url.searchParams));
  if (!qParsed.success) {
    return NextResponse.json({ error: 'invalid query' }, { status: 400 });
  }

  const { q, page, pageSize } = qParsed.data;
  const since = url.searchParams.get('since');
  const result = await listRecordsPaged(app, config, {
    search: q,
    page,
    pageSize,
    where: since ? { updatedAt: { gte: new Date(since) } } : undefined,
  });

  let items: unknown[] = result.rows;

  // Per-entity post-processing: resolve refs that the iOS picker needs.
  if (entityParsed.data === 'sales.customer') {
    // The Prisma column is `defaultPriceType` (UUID string), NOT
    // `defaultPriceTypeId` — codegen emits the field name verbatim from
    // the DSL, no `Id` suffix. We read the raw UUID off that column and
    // overwrite it with the resolved `{ id, name }` object iOS expects.
    const rows = result.rows as Array<Record<string, unknown>>;
    const refIds = Array.from(
      new Set(
        rows
          .map((r) => r.defaultPriceType)
          .filter((v): v is string => typeof v === 'string' && v.length > 0),
      ),
    );
    const priceTypes =
      refIds.length === 0
        ? []
        : await withTenant(app.tenant.id, async (tx) =>
            tx.catalog_sales_price_type.findMany({
              where: { id: { in: refIds } },
              select: { id: true, name: true },
            }),
          );
    const nameById = new Map(priceTypes.map((p) => [String(p.id), p.name as string]));
    items = rows.map((r) => {
      const refId = r.defaultPriceType;
      const resolved =
        typeof refId === 'string' && nameById.has(refId)
          ? { id: refId, name: nameById.get(refId)! }
          : null;
      return { ...r, defaultPriceType: resolved };
    });
  }

  // Apply financial-field redaction for warehouse-scoped reads
  const redacted = items.map((row) => redactFinancialFields(row, app));

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
  ctx: { params: Promise<{ entity: string }> },
): Promise<Response> {
  const { entity } = await ctx.params;
  // Resolve mobile aliases before validation
  const aliasedEntity = MOBILE_CATALOG_ALIASES[entity] ?? entity;
  const entityParsed = CatalogEntityParamSchema.safeParse(aliasedEntity);
  if (!entityParsed.success) {
    return NextResponse.json({ error: 'invalid entity' }, { status: 400 });
  }
  const config = resolveConfig(entityParsed.data);
  if (!config) return NextResponse.json({ error: 'unknown entity' }, { status: 404 });

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

  const payload = (await req.json()) as Record<string, unknown>;
  const created = await createRecord(app, config, payload);

  // Don't Zod-parse our own response (see GET above).
  const body = {
    id: created.id as string,
    record: created,
  };

  await storeIdempotency(app.tenant.id, idempotencyKey, {
    resourceType: config.id,
    resourceId: created.id as string,
    responseBody: body,
    statusCode: 201,
  });

  return NextResponse.json(body, { status: 201 });
}
