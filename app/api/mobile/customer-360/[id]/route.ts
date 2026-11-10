import '@/configs/sales/catalogs/customer';
import '@/configs/sales/documents/sales-invoice';
import '@/configs/sales/documents/payment-received';

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

export async function GET(
  _req: Request,
  ctx: { params: Promise<{ id: string }> },
): Promise<Response> {
  let app: Awaited<ReturnType<typeof requireTenantContext>>;
  try {
    app = await requireTenantContext();
  } catch {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  const { id } = await ctx.params;
  const tenantId = app.tenant.id;

  const customer = await withTenant(tenantId, async (tx) => {
    const bag = tx as unknown as {
      catalog_sales_customer: {
        findUnique: (args: unknown) => Promise<
          { id: string; code: string | null; name: string; phone: string | null; email: string | null; address: string | null } | null
        >;
      };
    };
    return bag.catalog_sales_customer.findUnique({
      where: { tenantId_id: { tenantId, id } },
      select: { id: true, code: true, name: true, phone: true, email: true, address: true },
    });
  });

  if (!customer) {
    return NextResponse.json({ error: 'not found' }, { status: 404 });
  }

  const [balanceTrend, invoices, payments] = await Promise.all([
    // Balance trend: last 12 weeks of A/R movements per week
    withTenant(tenantId, async (tx) => {
      const bag = tx as unknown as {
        movement_sales_accounts_receivable: {
          findMany: (args: unknown) => Promise<
            Array<{ kind: string; amount: unknown; timestamp: Date }>
          >;
        };
      };
      const now = new Date();
      const weeksAgo = new Date(now);
      weeksAgo.setUTCDate(weeksAgo.getUTCDate() - 84); // 12 weeks
      const rows = await bag.movement_sales_accounts_receivable.findMany({
        where: { active: true, customer: id, timestamp: { gte: weeksAgo } },
        select: { kind: true, amount: true, timestamp: true },
        orderBy: { timestamp: 'asc' },
      });

      // Build weekly running balance
      const byWeek = new Map<string, { weekStart: string; balance: number }>();
      for (let i = 12; i >= 0; i--) {
        const d = new Date(now);
        d.setUTCDate(d.getUTCDate() - i * 7);
        // Week starts on Monday
        const dayOfWeek = d.getUTCDay();
        const mondayOffset = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
        d.setUTCDate(d.getUTCDate() + mondayOffset);
        const key = d.toISOString().slice(0, 10);
        byWeek.set(key, { weekStart: key, balance: 0 });
      }

      let runningBalance = 0;
      for (const row of rows) {
        const signed = row.kind === 'income' ? toNumber(row.amount) : -toNumber(row.amount);
        runningBalance += signed;
        const d = new Date(row.timestamp);
        const dayOfWeek = d.getUTCDay();
        const mondayOffset = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
        d.setUTCDate(d.getUTCDate() + mondayOffset);
        const key = d.toISOString().slice(0, 10);
        const entry = byWeek.get(key);
        if (entry) {
          entry.balance = runningBalance;
        } else {
          // Fallback: find closest week
          const keys = Array.from(byWeek.keys()).sort();
          const closest = keys.find((k) => k >= key) ?? keys[keys.length - 1];
          if (closest) {
            byWeek.get(closest)!.balance = runningBalance;
          }
        }
      }

      // Fill forward: if a week has no transactions, use previous week's balance
      const sortedKeys = Array.from(byWeek.keys()).sort();
      let lastBalance = 0;
      for (const key of sortedKeys) {
        const entry = byWeek.get(key)!;
        if (entry.balance === 0 && lastBalance !== 0) {
          entry.balance = lastBalance;
        } else if (entry.balance !== 0) {
          lastBalance = entry.balance;
        }
      }

      return sortedKeys.map((k) => byWeek.get(k)!);
    }),

    // Recent invoices
    withTenant(tenantId, async (tx) => {
      const bag = tx as unknown as {
        document_sales_invoice: {
          findMany: (args: unknown) => Promise<
            Array<{ id: string; number: string; date: Date; status: string; postedAt: Date | null }>
          >;
        };
        documentLine_sales_invoice_items: {
          findMany: (args: unknown) => Promise<
            Array<{ documentId: string; total: unknown }>
          >;
        };
      };
      const invoices = await bag.document_sales_invoice.findMany({
        where: { tenantId, customer: id, deletedAt: null },
        select: { id: true, number: true, date: true, status: true, postedAt: true },
        orderBy: { date: 'desc' },
        take: 20,
      });

      const invoiceIds = invoices.map((i) => i.id);
      const lines = invoiceIds.length > 0
        ? await bag.documentLine_sales_invoice_items.findMany({
            where: { documentId: { in: invoiceIds } },
            select: { documentId: true, total: true },
          })
        : [];

      const totalByInvoice = new Map<string, number>();
      for (const line of lines) {
        totalByInvoice.set(line.documentId, (totalByInvoice.get(line.documentId) ?? 0) + toNumber(line.total));
      }

      return invoices.map((inv) => ({
        id: inv.id,
        number: inv.number,
        date: inv.date.toISOString(),
        status: inv.status,
        postedAt: inv.postedAt?.toISOString() ?? null,
        total: totalByInvoice.get(inv.id) ?? 0,
      }));
    }),

    // Recent payments
    withTenant(tenantId, async (tx) => {
      const bag = tx as unknown as {
        document_sales_payment_received: {
          findMany: (args: unknown) => Promise<
            Array<{ id: string; number: string; date: Date; amount: unknown; status: string; postedAt: Date | null }>
          >;
        };
      };
      const payments = await bag.document_sales_payment_received.findMany({
        where: { tenantId, customer: id, deletedAt: null },
        select: { id: true, number: true, date: true, amount: true, status: true, postedAt: true },
        orderBy: { date: 'desc' },
        take: 20,
      });

      return payments.map((p) => ({
        id: p.id,
        number: p.number,
        date: p.date.toISOString(),
        amount: toNumber(p.amount),
        status: p.status,
        postedAt: p.postedAt?.toISOString() ?? null,
      }));
    }),
  ]);

  // Current balance from register
  const currentBalance = await withTenant(tenantId, async (tx) => {
    const bag = tx as unknown as {
      movement_sales_accounts_receivable: {
        findMany: (args: unknown) => Promise<
          Array<{ kind: string; amount: unknown }>
        >;
      };
    };
    const rows = await bag.movement_sales_accounts_receivable.findMany({
      where: { active: true, customer: id },
      select: { kind: true, amount: true },
    });
    let balance = 0;
    for (const row of rows) {
      balance += row.kind === 'income' ? toNumber(row.amount) : -toNumber(row.amount);
    }
    return balance;
  });

  return NextResponse.json({
    customer: {
      id: customer.id,
      code: customer.code,
      name: customer.name,
      phone: customer.phone,
      email: customer.email,
      address: customer.address,
    },
    balance: currentBalance,
    currency: app.tenant.currency,
    balanceTrend,
    invoices,
    payments,
    stockOuts: [], // Placeholder — stock-out document type not yet available
  });
}
