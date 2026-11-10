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

  const result = await withTenant(tenantId, async (tx) => {
    const bag = tx as unknown as {
      movement_sales_accounts_receivable: {
        findMany: (args: unknown) => Promise<
          Array<{ kind: string; amount: unknown; customer: string }>
        >;
      };
      document_sales_invoice: {
        findMany: (args: unknown) => Promise<
          Array<{ id: string; customer: string; date: Date; number: string }>
        >;
      };
      catalog_sales_customer: {
        findMany: (args: unknown) => Promise<
          Array<{ id: string; name: string }>
        >;
      };
    };

    // Total open A/R
    const arRows = await bag.movement_sales_accounts_receivable.findMany({
      where: { active: true },
      select: { kind: true, amount: true, customer: true },
    });

    const balanceByCustomer = new Map<string, number>();
    for (const r of arRows) {
      const prev = balanceByCustomer.get(r.customer) ?? 0;
      const signed = r.kind === 'income' ? toNumber(r.amount) : -toNumber(r.amount);
      balanceByCustomer.set(r.customer, prev + signed);
    }

    const totalOpenAR = Array.from(balanceByCustomer.values())
      .filter((b) => b > 0)
      .reduce((sum, b) => sum + b, 0);

    // Top 3 overdue receivables
    const now = new Date();
    const thirtyDaysAgo = new Date(now);
    thirtyDaysAgo.setUTCDate(thirtyDaysAgo.getUTCDate() - 30);

    const invoices = await bag.document_sales_invoice.findMany({
      where: {
        deletedAt: null,
        status: 'POSTED',
        date: { lte: thirtyDaysAgo },
      },
      select: { id: true, customer: true, date: true, number: true },
      orderBy: { date: 'asc' },
    });

    // Earliest invoice per customer
    const earliestByCustomer = new Map<string, Date>();
    for (const inv of invoices) {
      const prev = earliestByCustomer.get(inv.customer);
      if (!prev || inv.date < prev) earliestByCustomer.set(inv.customer, inv.date);
    }

    const overdueCustomers = Array.from(earliestByCustomer.entries())
      .filter(([cid]) => (balanceByCustomer.get(cid) ?? 0) > 0)
      .sort(([, da], [, db]) => da.getTime() - db.getTime())
      .slice(0, 3);

    const customerIds = overdueCustomers.map(([cid]) => cid);
    const customers = customerIds.length > 0
      ? await bag.catalog_sales_customer.findMany({
          where: { id: { in: customerIds } },
          select: { id: true, name: true },
        })
      : [];

    const nameById = new Map(customers.map((c) => [c.id, c.name]));

    const top3Overdue = overdueCustomers.map(([customerId, earliest]) => {
      const daysOverdue = Math.floor(
        (now.getTime() - new Date(earliest).getTime()) / (1000 * 60 * 60 * 24),
      );
      return {
        counterpartyName: nameById.get(customerId) ?? customerId,
        amount: balanceByCustomer.get(customerId) ?? 0,
        daysOverdue,
      };
    });

    return {
      totalOpenAR,
      top3Overdue,
    };
  });

  return NextResponse.json({
    ...result,
    currency: app.tenant.currency,
  });
}
