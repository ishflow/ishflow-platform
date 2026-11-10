import '@/configs/inventory/catalogs/product';
import '@/configs/inventory/catalogs/warehouse';
import '@/configs/purchases/catalogs/supplier';
import '@/configs/sales/catalogs/customer';
import '@/configs/sales/catalogs/price-type';

import { requireTenantContext } from '@/platform/auth/current-context';
import { withTenant } from '@/platform/db/tenant-context';
import { getRecord } from '@/platform/engine';
import { getRegistry } from '@/platform/metadata';
import { CatalogEntityParamSchema } from '@ishflow/mobile-api-contract';
import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export async function GET(
  _req: Request,
  ctx: { params: Promise<{ entity: string; id: string }> },
): Promise<Response> {
  const { entity, id } = await ctx.params;
  const entityParsed = CatalogEntityParamSchema.safeParse(entity);
  if (!entityParsed.success) {
    return NextResponse.json({ error: 'invalid entity' }, { status: 400 });
  }
  const config = getRegistry().catalog[entityParsed.data];
  if (!config) return NextResponse.json({ error: 'unknown entity' }, { status: 404 });

  let app: Awaited<ReturnType<typeof requireTenantContext>>;
  try {
    app = await requireTenantContext();
  } catch {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  const row = await getRecord(app, config, id);
  if (!row) return NextResponse.json({ error: 'not found' }, { status: 404 });

  // sales.customer rows ship `defaultPriceType` as a raw FK UUID string
  // (no `Id` suffix — codegen emits the DSL field name verbatim). The iOS
  // `CatalogRecord` decoder expects an enriched `{ id, name }` object so
  // the wizard can pre-fill the price-type picker without a second fetch.
  // Mirror the list endpoint's enrichment for the single-record path.
  let body: Record<string, unknown> = row as Record<string, unknown>;
  if (entityParsed.data === 'sales.customer') {
    const refId = body.defaultPriceType;
    if (typeof refId === 'string' && refId.length > 0) {
      const resolved = await withTenant(app.tenant.id, async (tx) => {
        const found = await tx.catalog_sales_price_type.findFirst({
          where: { id: refId },
          select: { id: true, name: true },
        });
        return found ? { id: String(found.id), name: found.name } : null;
      });
      body = { ...body, defaultPriceType: resolved };
    } else {
      body = { ...body, defaultPriceType: null };
    }
  }
  return NextResponse.json(body);
}
