import '@/configs/inventory/catalogs/product';
import '@/configs/inventory/registers/product-price';
import '@/configs/inventory/registers/stock-balance';
import '@/configs/sales/catalogs/price-type';

import { requireTenantContext } from '@/platform/auth/current-context';
import { withTenant } from '@/platform/db/tenant-context';
import { getProductAvgCost, resolvePriceForType } from '@/platform/engine/pricing';
import { getRegistry } from '@/platform/metadata';
import { NextResponse } from 'next/server';
import { z } from 'zod';

export const dynamic = 'force-dynamic';

const ParamsSchema = z.object({
  id: z.string().uuid(),
});

export async function GET(
  _req: Request,
  ctx: { params: Promise<{ id: string }> },
): Promise<Response> {
  const params = await ctx.params;
  const parsed = ParamsSchema.safeParse(params);
  if (!parsed.success) {
    return NextResponse.json({ error: 'invalid id' }, { status: 400 });
  }
  const productId = parsed.data.id.toLowerCase();

  let app: Awaited<ReturnType<typeof requireTenantContext>>;
  try {
    app = await requireTenantContext();
  } catch {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  const now = new Date();

  const items = await withTenant(app.tenant.id, async (tx) => {
    const priceTypes = await tx.catalog_sales_price_type.findMany({
      where: { tenantId: app.tenant.id, deletedAt: null },
      select: { id: true, name: true, kind: true, isDefault: true },
      orderBy: [{ isDefault: 'desc' }, { name: 'asc' }],
    });

    // Compute live avg cost once so dynamic-no-base price types (e.g.
    // "markup over current avgCost") resolve to a real number — what the
    // sales wizard will actually charge — instead of being filtered out.
    const stockRegister = getRegistry().accumulationRegister['inventory.stock_balance'];
    const liveCost = stockRegister
      ? (await getProductAvgCost(tx, stockRegister, productId)).cost
      : 0;

    const resolved = await Promise.all(
      priceTypes.map(async (pt) => {
        try {
          const value = await resolvePriceForType(
            tx,
            app.tenant.id,
            productId,
            now,
            pt.id as string,
            new Set<string>(),
            { liveCost },
          );
          return value === null
            ? null
            : {
                priceTypeId: pt.id as string,
                priceTypeName: pt.name as string,
                kind: (pt.kind as string) ?? 'static',
                isDefault: Boolean(pt.isDefault),
                value: value.toFixed(2),
              };
        } catch {
          return null;
        }
      }),
    );

    return resolved.filter((r): r is NonNullable<typeof r> => r !== null);
  });

  return NextResponse.json({ items });
}
