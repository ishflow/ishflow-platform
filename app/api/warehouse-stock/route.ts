import '@/configs/inventory/catalogs/product';
import '@/configs/inventory/catalogs/warehouse';
import '@/configs/inventory/registers/stock-balance';

import { requireTenantContext } from '@/platform/auth/current-context';
import { withTenant } from '@/platform/db/tenant-context';
import { hasPermission } from '@/platform/engine/permissions';
import { registerBalanceGrouped } from '@/platform/engine/register-query';
import type { AccumulationRegisterConfig } from '@/platform/metadata';
import { getRegistry } from '@/platform/metadata';
import { NextResponse } from 'next/server';
import { z } from 'zod';

export const dynamic = 'force-dynamic';

const QuerySchema = z.object({ warehouse: z.string().uuid() });

type StockItem = {
  productId: string;
  productLabel: string;
  quantity: number;
};

export async function GET(req: Request) {
  const ctx = await requireTenantContext();
  const { tenant } = ctx;
  if (!tenant) {
    return NextResponse.json({ error: 'unauthenticated' }, { status: 401 });
  }
  if (!hasPermission(ctx.permissions, 'inventory.warehouse_stock:read')) {
    return NextResponse.json({ error: 'forbidden' }, { status: 403 });
  }

  const url = new URL(req.url);
  const parsed = QuerySchema.safeParse(Object.fromEntries(url.searchParams));
  if (!parsed.success) {
    return NextResponse.json({ error: 'bad_request' }, { status: 400 });
  }

  const stockRegister = getRegistry().register['inventory.stock_balance'] as
    | AccumulationRegisterConfig
    | undefined;
  if (!stockRegister) {
    return NextResponse.json({ error: 'register_not_found' }, { status: 500 });
  }

  const items = await withTenant(tenant.id, async (tx) => {
    const rows = (await registerBalanceGrouped(
      tx,
      stockRegister,
      { warehouse: parsed.data.warehouse },
      ['product'],
    )) as Array<{ product: string; quantity: number | string }>;
    const positive = rows.filter((r) => Number(r.quantity ?? 0) > 0);
    if (positive.length === 0) return [] as StockItem[];
    const ids = positive.map((r) => r.product);
    const labels = await (
      tx as unknown as {
        catalog_inventory_product: {
          findMany: (a: unknown) => Promise<Array<{ id: string; name: string }>>;
        };
      }
    ).catalog_inventory_product.findMany({
      where: { id: { in: ids } },
      select: { id: true, name: true },
    });
    const labelMap = new Map(labels.map((l) => [l.id, l.name]));
    const out = positive.map<StockItem>((r) => ({
      productId: r.product,
      productLabel: labelMap.get(r.product) ?? r.product.slice(0, 6),
      quantity: Number(r.quantity ?? 0),
    }));
    out.sort((a, b) => a.productLabel.localeCompare(b.productLabel));
    return out;
  });

  const total = items.reduce((acc, r) => acc + r.quantity, 0);
  return NextResponse.json({ items, total });
}
