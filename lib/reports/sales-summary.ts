import type { SalesSummaryResponse } from '@ishflow/mobile-api-contract';
import type { Prisma } from '@prisma/client';

type Tx = Prisma.TransactionClient;

type SaleMovementRow = {
  counterparty: string;
  product: string;
  quantity: number;
  revenue: Prisma.Decimal | number | string;
  kind: string;
  docRef: string;
};

type CustomerRow = { id: string; name: string };
type ProductRow = { id: string; name: string };

function toNumber(v: unknown): number {
  if (v === null || v === undefined) return 0;
  if (typeof v === 'number') return v;
  if (typeof v === 'string') return Number(v) || 0;
  const n = Number(v as never);
  return Number.isFinite(n) ? n : 0;
}

function fmt(n: number): string {
  return n.toFixed(2);
}

/**
 * Build a sales-summary aggregate for a single tenant inside an already-open
 * RLS transaction. Reads `movement_sales_sale` rows in `[from, to]` so the
 * computation matches the dashboard / register viewer (posted-only by virtue
 * of `active = true`).
 *
 * Customer / product names are looked up in a single batch each, so this
 * stays O(N) on rows + O(C+P) on lookups.
 */
export async function buildSalesSummary(
  tx: Tx,
  from: Date,
  to: Date,
): Promise<SalesSummaryResponse> {
  const bag = tx as unknown as {
    movement_sales_sale: {
      findMany: (args: unknown) => Promise<SaleMovementRow[]>;
    };
    catalog_sales_customer: {
      findMany: (args: unknown) => Promise<CustomerRow[]>;
    };
    catalog_inventory_product: {
      findMany: (args: unknown) => Promise<ProductRow[]>;
    };
  };

  const rows = await bag.movement_sales_sale.findMany({
    where: { active: true, kind: 'income', timestamp: { gte: from, lte: to } },
    select: { counterparty: true, product: true, quantity: true, revenue: true, docRef: true },
  });

  const byCustomer = new Map<string, { total: number; invoices: Set<string> }>();
  const byProduct = new Map<string, { qty: number; revenue: number }>();
  const invoiceIds = new Set<string>();
  let totalRevenue = 0;

  for (const row of rows) {
    const rev = toNumber(row.revenue);
    totalRevenue += rev;
    invoiceIds.add(row.docRef);

    const cust = byCustomer.get(row.counterparty) ?? {
      total: 0,
      invoices: new Set<string>(),
    };
    cust.total += rev;
    cust.invoices.add(row.docRef);
    byCustomer.set(row.counterparty, cust);

    const prod = byProduct.get(row.product) ?? { qty: 0, revenue: 0 };
    prod.qty += Number(row.quantity) || 0;
    prod.revenue += rev;
    byProduct.set(row.product, prod);
  }

  const customerIds = [...byCustomer.keys()];
  const productIds = [...byProduct.keys()];

  const customers = customerIds.length
    ? await bag.catalog_sales_customer.findMany({
        where: { id: { in: customerIds } },
        select: { id: true, name: true },
      })
    : [];
  const products = productIds.length
    ? await bag.catalog_inventory_product.findMany({
        where: { id: { in: productIds } },
        select: { id: true, name: true },
      })
    : [];

  const customerName = new Map(customers.map((c) => [c.id, c.name]));
  const productName = new Map(products.map((p) => [p.id, p.name]));

  return {
    period: { from: from.toISOString(), to: to.toISOString() },
    totalRevenue: fmt(totalRevenue),
    invoiceCount: invoiceIds.size,
    byCustomer: [...byCustomer.entries()]
      .map(([id, v]) => ({
        customerId: id,
        customerName: customerName.get(id) ?? '',
        total: fmt(v.total),
        count: v.invoices.size,
      }))
      .sort((a, b) => Number(b.total) - Number(a.total)),
    byProduct: [...byProduct.entries()]
      .map(([id, v]) => ({
        productId: id,
        productName: productName.get(id) ?? '',
        qty: fmt(v.qty),
        revenue: fmt(v.revenue),
      }))
      .sort((a, b) => Number(b.revenue) - Number(a.revenue)),
  };
}
