import '@/configs/inventory/catalogs/product';
import '@/configs/inventory/catalogs/warehouse';
import '@/configs/inventory/registers/stock-balance';

import { requireTenantContext } from '@/platform/auth/current-context';
import { withTenant } from '@/platform/db/tenant-context';
import { registerBalanceGrouped } from '@/platform/engine';
import { getRegistry } from '@/platform/metadata';
import { StockBatchQuerySchema, type StockBatchResponse } from '@ishflow/mobile-api-contract';
import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

const MAX_PRODUCT_IDS = 100;

export async function GET(req: Request): Promise<Response> {
  let app: Awaited<ReturnType<typeof requireTenantContext>>;
  try {
    app = await requireTenantContext();
  } catch {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  const url = new URL(req.url);
  const parsed = StockBatchQuerySchema.safeParse(Object.fromEntries(url.searchParams));
  if (!parsed.success) {
    return NextResponse.json({ error: 'invalid query' }, { status: 400 });
  }

  const productIds = parsed.data.productIds.split(',').map((s) => s.trim()).filter(Boolean);
  if (productIds.length === 0) {
    return NextResponse.json({ error: 'productIds required' }, { status: 400 });
  }
  if (productIds.length > MAX_PRODUCT_IDS) {
    return NextResponse.json({ error: 'too many productIds (max 100)' }, { status: 400 });
  }

  const registry = getRegistry();
  const stockRegister = registry.register['inventory.stock_balance'];
  if (!stockRegister) {
    return NextResponse.json({ error: 'misconfigured' }, { status: 500 });
  }

  const grouped = await withTenant(app.tenant.id, (tx) =>
    registerBalanceGrouped(
      tx,
      stockRegister,
      { product: { in: productIds } },
      ['product', 'warehouse'],
    ),
  );

  const resourceKey = Object.keys(stockRegister.resources)[0];
  if (!resourceKey) {
    return NextResponse.json({ error: 'misconfigured' }, { status: 500 });
  }

  const warehouseIds = Array.from(new Set(grouped.map((r) => String(r.warehouse))));
  const warehouses =
    warehouseIds.length === 0
      ? []
      : await withTenant(app.tenant.id, async (tx) =>
          tx.catalog_inventory_warehouse.findMany({
            where: { id: { in: warehouseIds } },
            select: { id: true, name: true },
          }),
        );
  const warehouseNameById = new Map(warehouses.map((w) => [String(w.id), w.name as string]));

  const byProduct = new Map<string, Array<{ warehouseId: string; warehouseName: string; qty: string }>>();
  for (const id of productIds) byProduct.set(id, []);
  for (const row of grouped) {
    const productId = String(row.product);
    const warehouseId = String(row.warehouse);
    const qty = Number(row[resourceKey] ?? 0);
    if (qty <= 0) continue;
    const warehouseName = warehouseNameById.get(warehouseId) ?? '';
    if (!warehouseName) continue;
    const list = byProduct.get(productId);
    if (!list) continue;
    list.push({ warehouseId, warehouseName, qty: qty.toString() });
  }

  for (const list of byProduct.values()) {
    list.sort((a, b) => a.warehouseName.localeCompare(b.warehouseName));
  }

  const body: StockBatchResponse = {
    items: productIds.map((productId) => ({
      productId,
      byWarehouse: byProduct.get(productId) ?? [],
    })),
  };

  return NextResponse.json(body);
}
