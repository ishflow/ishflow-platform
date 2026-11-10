import '@/configs/inventory/catalogs/product';

import { requireTenantContext } from '@/platform/auth/current-context';
import { withTenant } from '@/platform/db/tenant-context';
import { ProductByBarcodeQuerySchema } from '@ishflow/mobile-api-contract';
import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export async function GET(req: Request): Promise<Response> {
  let app: Awaited<ReturnType<typeof requireTenantContext>>;
  try {
    app = await requireTenantContext();
  } catch {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  const url = new URL(req.url);
  const parsed = ProductByBarcodeQuerySchema.safeParse(Object.fromEntries(url.searchParams));
  if (!parsed.success) {
    return NextResponse.json({ error: 'invalid query', details: parsed.error.format() }, { status: 400 });
  }

  const { barcode } = parsed.data;

  const product = await withTenant(app.tenant.id, async (tx) =>
    tx.catalog_inventory_product.findFirst({
      where: {
        tenantId: app.tenant.id,
        barcode,
        deletedAt: null,
      },
      select: {
        id: true,
        code: true,
        name: true,
        barcode: true,
      },
    }),
  );

  if (!product) {
    return NextResponse.json({ error: 'barcode_not_found' }, { status: 404 });
  }

  return NextResponse.json({
    id: product.id,
    code: product.code,
    name: product.name,
    barcode: product.barcode,
  });
}
