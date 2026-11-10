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

const QuerySchema = z.object({ product: z.string().uuid() });

type BreakdownRow = {
  warehouseId: string;
  warehouseLabel: string;
  quantity: number;
};

export async function GET(req: Request) {
  const ctx = await requireTenantContext();
  const { tenant } = ctx;
  if (!tenant) {
    return NextResponse.json({ error: 'unauthenticated' }, { status: 401 });
  }
  // Per-warehouse stock is sensitive; gate like the twin /api/warehouse-stock.
  // Every role that enters product lines holds this perm (cashier, the only
  // role without it, has no product-line flow). Finding A3.
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

  const breakdown = await withTenant(tenant.id, async (tx) => {
    const rows = (await registerBalanceGrouped(
      tx,
      stockRegister,
      { product: parsed.data.product },
      ['warehouse'],
    )) as Array<{ warehouse: string; quantity: number | string }>;
    const ids = rows.map((r) => r.warehouse);
    const labels = await (
      tx as unknown as {
        catalog_inventory_warehouse: {
          findMany: (a: unknown) => Promise<Array<{ id: string; name: string }>>;
        };
      }
    ).catalog_inventory_warehouse.findMany({
      where: { id: { in: ids } },
      select: { id: true, name: true },
    });
    const labelMap = new Map(labels.map((l) => [l.id, l.name]));
    return rows.map<BreakdownRow>((r) => ({
      warehouseId: r.warehouse,
      warehouseLabel: labelMap.get(r.warehouse) ?? r.warehouse.slice(0, 6),
      quantity: Number(r.quantity ?? 0),
    }));
  });

  const total = breakdown.reduce((acc, r) => acc + r.quantity, 0);
  return NextResponse.json({ breakdown, total });
}
