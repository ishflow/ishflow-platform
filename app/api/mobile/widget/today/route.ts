import '@/configs/sales/documents/sales-invoice';

import { requireTenantContext } from '@/platform/auth/current-context';
import { withTenant } from '@/platform/db/tenant-context';
import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

function toNumber(v: unknown): number {
  if (v === null || v === undefined) return 0;
  if (typeof v === 'number') return v;
  if (typeof v === 'string') return Number(v);
  const coerced = Number(v as never);
  return Number.isFinite(coerced) ? coerced : 0;
}

export async function GET(): Promise<Response> {
  let app: Awaited<ReturnType<typeof requireTenantContext>>;
  try {
    app = await requireTenantContext();
  } catch {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  const tenantId = app.tenant.id;

  const today = new Date();
  today.setUTCHours(0, 0, 0, 0);
  const tomorrow = new Date(today);
  tomorrow.setUTCDate(tomorrow.getUTCDate() + 1);

  const result = await withTenant(tenantId, async (tx) => {
    const bag = tx as unknown as {
      document_sales_invoice: {
        findMany: (args: unknown) => Promise<
          Array<{ id: string }>
        >;
      };
      movement_sales_sale: {
        aggregate: (args: unknown) => Promise<{ _sum: { revenue?: unknown } }>;
      };
    };

    const [invoices, agg] = await Promise.all([
      bag.document_sales_invoice.findMany({
        where: {
          tenantId,
          deletedAt: null,
          status: 'POSTED',
          postedAt: { gte: today, lt: tomorrow },
        },
        select: { id: true },
      }),
      bag.movement_sales_sale.aggregate({
        _sum: { revenue: true },
        where: {
          active: true,
          kind: 'income',
          timestamp: { gte: today, lt: tomorrow },
        },
      }),
    ]);

    return {
      salesCount: invoices.length,
      totalSales: toNumber(agg._sum.revenue),
    };
  });

  return NextResponse.json({
    ...result,
    currency: app.tenant.currency,
  });
}
