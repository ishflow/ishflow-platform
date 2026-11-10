import '@/configs/sales/catalogs/customer';
import '@/configs/sales/documents/sales-invoice';
import '@/configs/sales/documents/payment-received';
import '@/configs/purchases/catalogs/supplier';
import '@/configs/purchases/documents/purchase-invoice';
import '@/configs/purchases/documents/payment-sent';

import { requireTenantContext } from '@/platform/auth/current-context';
import { withTenant } from '@/platform/db/tenant-context';

import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

type Kind = 'customer' | 'supplier';

function toNumber(v: unknown): number {
  if (v === null || v === undefined) return 0;
  if (typeof v === 'number') return v;
  if (typeof v === 'string') return Number(v);
  const coerced = Number(v as never);
  return Number.isFinite(coerced) ? coerced : 0;
}

function weekStartKey(d: Date): string {
  const day = d.getUTCDay();
  const mondayOffset = day === 0 ? -6 : 1 - day;
  const out = new Date(d);
  out.setUTCDate(out.getUTCDate() + mondayOffset);
  return out.toISOString().slice(0, 10);
}

function buildEmptyTrend(): Map<string, { weekStart: string; balance: number }> {
  const now = new Date();
  const byWeek = new Map<string, { weekStart: string; balance: number }>();
  for (let i = 12; i >= 0; i--) {
    const d = new Date(now);
    d.setUTCDate(d.getUTCDate() - i * 7);
    const key = weekStartKey(d);
    byWeek.set(key, { weekStart: key, balance: 0 });
  }
  return byWeek;
}

function applyMovements(
  byWeek: Map<string, { weekStart: string; balance: number }>,
  rows: Array<{ kind: string; amount: unknown; timestamp: Date }>,
): Array<{ weekStart: string; balance: number }> {
  let runningBalance = 0;
  for (const row of rows) {
    const signed = row.kind === 'income' ? toNumber(row.amount) : -toNumber(row.amount);
    runningBalance += signed;
    const key = weekStartKey(new Date(row.timestamp));
    const entry = byWeek.get(key);
    if (entry) {
      entry.balance = runningBalance;
    } else {
      const keys = Array.from(byWeek.keys()).sort();
      const closest = keys.find((k) => k >= key) ?? keys[keys.length - 1];
      if (closest) byWeek.get(closest)!.balance = runningBalance;
    }
  }
  const sortedKeys = Array.from(byWeek.keys()).sort();
  let lastBalance = 0;
  for (const key of sortedKeys) {
    const entry = byWeek.get(key)!;
    if (entry.balance === 0 && lastBalance !== 0) entry.balance = lastBalance;
    else if (entry.balance !== 0) lastBalance = entry.balance;
  }
  return sortedKeys.map((k) => byWeek.get(k)!);
}

export async function GET(
  req: Request,
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
  const url = new URL(req.url);
  const rawType = url.searchParams.get('type');
  const kind: Kind = rawType === 'supplier' ? 'supplier' : 'customer';

  if (kind === 'customer') return getCustomer(id, tenantId, app.tenant.currency);
  return getSupplier(id, tenantId, app.tenant.currency);
}

async function getCustomer(id: string, tenantId: string, currency: string): Promise<Response> {
  const customer = await withTenant(tenantId, async (tx) => {
    const bag = tx as unknown as {
      catalog_sales_customer: {
        findUnique: (args: unknown) => Promise<
          { id: string; name: string; phone: string | null; email: string | null; notes: string | null; updatedAt: Date } | null
        >;
      };
    };
    return bag.catalog_sales_customer.findUnique({
      where: { id },
      select: { id: true, name: true, phone: true, email: true, notes: true, updatedAt: true },
    });
  });

  if (!customer) {
    return NextResponse.json({ error: 'not found' }, { status: 404 });
  }

  const [balanceTrend, invoices, payments, productMovements] = await Promise.all([
    withTenant(tenantId, async (tx) => {
      const bag = tx as unknown as {
        movement_sales_accounts_receivable: {
          findMany: (args: unknown) => Promise<Array<{ kind: string; amount: unknown; timestamp: Date }>>;
        };
      };
      const weeksAgo = new Date();
      weeksAgo.setUTCDate(weeksAgo.getUTCDate() - 84);
      const rows = await bag.movement_sales_accounts_receivable.findMany({
        where: { active: true, customer: id, timestamp: { gte: weeksAgo } },
        select: { kind: true, amount: true, timestamp: true },
        orderBy: { timestamp: 'asc' },
      });
      return applyMovements(buildEmptyTrend(), rows);
    }),

    withTenant(tenantId, async (tx) => {
      const bag = tx as unknown as {
        document_sales_invoice: {
          findMany: (args: unknown) => Promise<
            Array<{ id: string; number: string; date: Date; status: string; postedAt: Date | null }>
          >;
        };
        documentLine_sales_invoice_items: {
          findMany: (args: unknown) => Promise<Array<{ documentId: string; quantity: number; price: unknown }>>;
        };
      };
      const invoices = await bag.document_sales_invoice.findMany({
        where: { tenantId, customer: id, deletedAt: null },
        select: { id: true, number: true, date: true, status: true, postedAt: true },
        orderBy: { date: 'desc' },
        take: 20,
      });
      const lines = invoices.length > 0
        ? await bag.documentLine_sales_invoice_items.findMany({
            where: { documentId: { in: invoices.map((i) => i.id) } },
            select: { documentId: true, quantity: true, price: true },
          })
        : [];
      const totalByInvoice = new Map<string, number>();
      for (const line of lines) {
        const lineTotal = toNumber(line.quantity) * toNumber(line.price);
        totalByInvoice.set(line.documentId, (totalByInvoice.get(line.documentId) ?? 0) + lineTotal);
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

    // Aggregate products purchased by this customer from sales invoice lines.
    withTenant(tenantId, async (tx) => {
      const bag = tx as unknown as {
        document_sales_invoice: {
          findMany: (args: unknown) => Promise<Array<{ id: string; date: Date }>>;
        };
        documentLine_sales_invoice_items: {
          findMany: (args: unknown) => Promise<
            Array<{ documentId: string; quantity: number; product: string | null; productName: string | null; date: Date | null }>
          >;
        };
      };
      const invoiceDocs = await bag.document_sales_invoice.findMany({
        where: { tenantId, customer: id, deletedAt: null, status: { not: 'DRAFT' } },
        select: { id: true, date: true },
      });
      if (invoiceDocs.length === 0) return [];
      const invoiceIds = invoiceDocs.map((i) => i.id);
      const dateById = new Map(invoiceDocs.map((i) => [i.id, i.date]));
      const lines = await bag.documentLine_sales_invoice_items.findMany({
        where: { documentId: { in: invoiceIds } },
        select: { documentId: true, quantity: true, product: true },
      });

      // Group by product name: sum qty, track max date.
      const byProduct = new Map<string, { totalQty: number; lastDate: Date | null }>();
      for (const line of lines) {
        const name = line.productName ?? line.product ?? 'Unknown';
        const lineDate = line.date ?? dateById.get(line.documentId) ?? null;
        const existing = byProduct.get(name);
        if (!existing) {
          byProduct.set(name, { totalQty: toNumber(line.quantity), lastDate: lineDate });
        } else {
          existing.totalQty += toNumber(line.quantity);
          if (lineDate && (!existing.lastDate || lineDate > existing.lastDate)) {
            existing.lastDate = lineDate;
          }
        }
      }

      return Array.from(byProduct.entries())
        .sort((a, b) => b[1].totalQty - a[1].totalQty)
        .map(([productName, { totalQty, lastDate }]) => ({
          productName,
          totalQty: totalQty.toString(),
          lastDate: lastDate?.toISOString().slice(0, 10) ?? null,
        }));
    }),
  ]);

  const currentBalance = await withTenant(tenantId, async (tx) => {
    const bag = tx as unknown as {
      movement_sales_accounts_receivable: {
        findMany: (args: unknown) => Promise<Array<{ kind: string; amount: unknown }>>;
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

  const customerNotes = customer.notes
    ? [{ text: customer.notes, createdAt: customer.updatedAt.toISOString(), author: null }]
    : [];

  return NextResponse.json({
    type: 'customer',
    counterparty: {
      id: customer.id,
      code: null,
      name: customer.name,
      phone: customer.phone,
      email: customer.email,
      address: null,
    },
    balance: currentBalance,
    currency,
    balanceTrend,
    invoices,
    payments,
    stockOuts: [],
    productMovements,
    notes: customerNotes,
  });
}

async function getSupplier(id: string, tenantId: string, currency: string): Promise<Response> {
  const supplier = await withTenant(tenantId, async (tx) => {
    const bag = tx as unknown as {
      catalog_purchases_supplier: {
        findUnique: (args: unknown) => Promise<
          { id: string; name: string; phone: string | null; email: string | null; notes: string | null; updatedAt: Date } | null
        >;
      };
    };
    return bag.catalog_purchases_supplier.findUnique({
      where: { id },
      select: { id: true, name: true, phone: true, email: true, notes: true, updatedAt: true },
    });
  });

  if (!supplier) {
    return NextResponse.json({ error: 'not found' }, { status: 404 });
  }

  const [balanceTrend, invoices, payments, productMovements] = await Promise.all([
    withTenant(tenantId, async (tx) => {
      const bag = tx as unknown as {
        movement_purchases_accounts_payable: {
          findMany: (args: unknown) => Promise<Array<{ kind: string; amount: unknown; timestamp: Date }>>;
        };
      };
      const weeksAgo = new Date();
      weeksAgo.setUTCDate(weeksAgo.getUTCDate() - 84);
      const rows = await bag.movement_purchases_accounts_payable.findMany({
        where: { active: true, supplier: id, timestamp: { gte: weeksAgo } },
        select: { kind: true, amount: true, timestamp: true },
        orderBy: { timestamp: 'asc' },
      });
      return applyMovements(buildEmptyTrend(), rows);
    }),

    withTenant(tenantId, async (tx) => {
      const bag = tx as unknown as {
        document_purchases_invoice: {
          findMany: (args: unknown) => Promise<
            Array<{ id: string; number: string; date: Date; status: string; postedAt: Date | null }>
          >;
        };
        documentLine_purchases_invoice_items: {
          findMany: (args: unknown) => Promise<Array<{ documentId: string; quantity: number; price: unknown }>>;
        };
      };
      const invoices = await bag.document_purchases_invoice.findMany({
        where: { tenantId, supplier: id, deletedAt: null },
        select: { id: true, number: true, date: true, status: true, postedAt: true },
        orderBy: { date: 'desc' },
        take: 20,
      });
      const lines = invoices.length > 0
        ? await bag.documentLine_purchases_invoice_items.findMany({
            where: { documentId: { in: invoices.map((i) => i.id) } },
            select: { documentId: true, quantity: true, price: true },
          })
        : [];
      const totalByInvoice = new Map<string, number>();
      for (const line of lines) {
        const lineTotal = toNumber(line.quantity) * toNumber(line.price);
        totalByInvoice.set(line.documentId, (totalByInvoice.get(line.documentId) ?? 0) + lineTotal);
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

    withTenant(tenantId, async (tx) => {
      const bag = tx as unknown as {
        document_purchases_payment_sent: {
          findMany: (args: unknown) => Promise<
            Array<{ id: string; number: string; date: Date; amount: unknown; status: string; postedAt: Date | null }>
          >;
        };
      };
      const payments = await bag.document_purchases_payment_sent.findMany({
        where: { tenantId, supplier: id, deletedAt: null },
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

    // Aggregate products supplied by this supplier from purchase invoice lines.
    withTenant(tenantId, async (tx) => {
      const bag = tx as unknown as {
        document_purchases_invoice: {
          findMany: (args: unknown) => Promise<Array<{ id: string; date: Date }>>;
        };
        documentLine_purchases_invoice_items: {
          findMany: (args: unknown) => Promise<
            Array<{ documentId: string; quantity: number; product: string | null; productName: string | null; date: Date | null }>
          >;
        };
      };
      const invoiceDocs = await bag.document_purchases_invoice.findMany({
        where: { tenantId, supplier: id, deletedAt: null, status: { not: 'DRAFT' } },
        select: { id: true, date: true },
      });
      if (invoiceDocs.length === 0) return [];
      const invoiceIds = invoiceDocs.map((i) => i.id);
      const dateById = new Map(invoiceDocs.map((i) => [i.id, i.date]));
      const lines = await bag.documentLine_purchases_invoice_items.findMany({
        where: { documentId: { in: invoiceIds } },
        select: { documentId: true, quantity: true, product: true },
      });

      const byProduct = new Map<string, { totalQty: number; lastDate: Date | null }>();
      for (const line of lines) {
        const name = line.productName ?? line.product ?? 'Unknown';
        const lineDate = line.date ?? dateById.get(line.documentId) ?? null;
        const existing = byProduct.get(name);
        if (!existing) {
          byProduct.set(name, { totalQty: toNumber(line.quantity), lastDate: lineDate });
        } else {
          existing.totalQty += toNumber(line.quantity);
          if (lineDate && (!existing.lastDate || lineDate > existing.lastDate)) {
            existing.lastDate = lineDate;
          }
        }
      }

      return Array.from(byProduct.entries())
        .sort((a, b) => b[1].totalQty - a[1].totalQty)
        .map(([productName, { totalQty, lastDate }]) => ({
          productName,
          totalQty: totalQty.toString(),
          lastDate: lastDate?.toISOString().slice(0, 10) ?? null,
        }));
    }),
  ]);

  const currentBalance = await withTenant(tenantId, async (tx) => {
    const bag = tx as unknown as {
      movement_purchases_accounts_payable: {
        findMany: (args: unknown) => Promise<Array<{ kind: string; amount: unknown }>>;
      };
    };
    const rows = await bag.movement_purchases_accounts_payable.findMany({
      where: { active: true, supplier: id },
      select: { kind: true, amount: true },
    });
    let balance = 0;
    for (const row of rows) {
      balance += row.kind === 'income' ? toNumber(row.amount) : -toNumber(row.amount);
    }
    return balance;
  });

  const supplierNotes = supplier.notes
    ? [{ text: supplier.notes, createdAt: supplier.updatedAt.toISOString(), author: null }]
    : [];

  return NextResponse.json({
    type: 'supplier',
    counterparty: {
      id: supplier.id,
      code: null,
      name: supplier.name,
      phone: supplier.phone,
      email: supplier.email,
      address: null,
    },
    balance: currentBalance,
    currency,
    balanceTrend,
    invoices,
    payments,
    stockOuts: [],
    productMovements,
    notes: supplierNotes,
  });
}
