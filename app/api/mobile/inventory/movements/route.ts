import { requireTenantContext } from '@/platform/auth/current-context';
import { withTenant } from '@/platform/db/tenant-context';
import { NextResponse } from 'next/server';
import type { Prisma } from '@prisma/client';
import { z } from 'zod';

export const dynamic = 'force-dynamic';

const QuerySchema = z.object({
  productId: z.string().uuid(),
  warehouseId: z.string().uuid().optional(),
  limit: z.coerce.number().int().min(1).max(100).default(50),
});

type Tx = Prisma.TransactionClient;

type MovementRow = {
  id: string;
  docRef: string;
  docType: string;
  kind: string;
  timestamp: Date;
  warehouse: string;
  quantity: number;
};

type DocRow = { id: string; number: string };

type WarehouseRow = { id: string; name: string };

async function fetchMovements(
  tx: Tx,
  tenantId: string,
  productId: string,
  warehouseId: string | undefined,
  limit: number,
): Promise<{
  movements: Array<{
    date: string;
    docKind: string;
    docId: string;
    docNumber: string;
    qty: string;
    direction: 'in' | 'out';
    warehouse: string;
  }>;
}> {
  const bag = tx as unknown as {
    movement_inventory_stock_balance: {
      findMany: (args: unknown) => Promise<MovementRow[]>;
    };
    document_sales_invoice: {
      findMany: (args: unknown) => Promise<DocRow[]>;
    };
    document_purchases_invoice: {
      findMany: (args: unknown) => Promise<DocRow[]>;
    };
    catalog_inventory_warehouse: {
      findMany: (args: unknown) => Promise<WarehouseRow[]>;
    };
  };

  const where: Record<string, unknown> = {
    tenantId,
    product: productId,
    active: true,
  };
  if (warehouseId) {
    where['warehouse'] = warehouseId;
  }

  const rows = await bag.movement_inventory_stock_balance.findMany({
    where,
    orderBy: { timestamp: 'desc' },
    take: limit,
  });

  if (rows.length === 0) return { movements: [] };

  // Collect doc IDs by type so we can batch-resolve numbers
  const salesInvoiceIds = rows
    .filter((r) => r.docType === 'document_sales_invoice')
    .map((r) => r.docRef);
  const purchaseInvoiceIds = rows
    .filter((r) => r.docType === 'document_purchases_invoice')
    .map((r) => r.docRef);
  const warehouseIds = [...new Set(rows.map((r) => r.warehouse))];

  const [salesInvoices, purchaseInvoices, warehouses] = await Promise.all([
    salesInvoiceIds.length > 0
      ? bag.document_sales_invoice.findMany({
          where: { id: { in: salesInvoiceIds } },
          select: { id: true, number: true },
        })
      : Promise.resolve([] as DocRow[]),
    purchaseInvoiceIds.length > 0
      ? bag.document_purchases_invoice.findMany({
          where: { id: { in: purchaseInvoiceIds } },
          select: { id: true, number: true },
        })
      : Promise.resolve([] as DocRow[]),
    bag.catalog_inventory_warehouse.findMany({
      where: { id: { in: warehouseIds } },
      select: { id: true, name: true },
    }),
  ]);

  const docNumberMap: Record<string, { number: string; kind: string }> = {};
  for (const doc of salesInvoices) {
    docNumberMap[doc.id] = { number: doc.number, kind: 'sales.invoice' };
  }
  for (const doc of purchaseInvoices) {
    docNumberMap[doc.id] = { number: doc.number, kind: 'purchases.invoice' };
  }

  const warehouseNameMap: Record<string, string> = {};
  for (const wh of warehouses) {
    warehouseNameMap[wh.id] = wh.name;
  }

  const movements = rows.map((row) => {
    const doc = docNumberMap[row.docRef];
    // kind from the movement register: "income" means stock in, "expense" means stock out
    const direction: 'in' | 'out' = row.kind === 'income' ? 'in' : 'out';
    const qty = Math.abs(row.quantity).toString();
    return {
      date: row.timestamp.toISOString(),
      docKind: doc?.kind ?? row.docType,
      docId: row.docRef,
      docNumber: doc?.number ?? '—',
      qty,
      direction,
      warehouse: warehouseNameMap[row.warehouse] ?? row.warehouse,
    };
  });

  return { movements };
}

export async function GET(req: Request): Promise<Response> {
  let app: Awaited<ReturnType<typeof requireTenantContext>>;
  try {
    app = await requireTenantContext();
  } catch {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  const url = new URL(req.url);
  const parsed = QuerySchema.safeParse({
    productId: url.searchParams.get('productId'),
    warehouseId: url.searchParams.get('warehouseId') ?? undefined,
    limit: url.searchParams.get('limit') ?? undefined,
  });
  if (!parsed.success) {
    return NextResponse.json({ error: 'invalid query', details: parsed.error.flatten() }, { status: 400 });
  }

  const { productId, warehouseId, limit } = parsed.data;
  const result = await withTenant(app.tenant.id, (tx) =>
    fetchMovements(tx, app.tenant.id, productId, warehouseId, limit),
  );

  return NextResponse.json(result);
}
