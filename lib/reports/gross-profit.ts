import type { GrossProfitResponse } from '@ishflow/mobile-api-contract';
import type { Prisma } from '@prisma/client';

type Tx = Prisma.TransactionClient;

type SaleMovementRow = {
  product: string;
  quantity: number;
  cost: Prisma.Decimal | number | string;
  revenue: Prisma.Decimal | number | string;
  kind: string;
};

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

function marginPct(revenue: number, profit: number): string {
  if (revenue === 0) return '0.00';
  return ((profit / revenue) * 100).toFixed(2);
}

/**
 * Gross profit = revenue − cogs, computed from `movement_sales_sale` rows in
 * the requested period. Posted documents only (`active = true`).
 *
 * The `sales-invoice` posting writes cost as `avgCost * quantity` per line,
 * so we can lean on the register and avoid re-traversing lines.
 */
export async function buildGrossProfit(tx: Tx, from: Date, to: Date): Promise<GrossProfitResponse> {
  const bag = tx as unknown as {
    movement_sales_sale: {
      findMany: (args: unknown) => Promise<SaleMovementRow[]>;
    };
    catalog_inventory_product: {
      findMany: (args: unknown) => Promise<ProductRow[]>;
    };
  };

  const rows = await bag.movement_sales_sale.findMany({
    where: { active: true, kind: 'income', timestamp: { gte: from, lte: to } },
    select: { product: true, quantity: true, cost: true, revenue: true },
  });

  let totalRevenue = 0;
  let totalCogs = 0;
  const byProduct = new Map<string, { revenue: number; cogs: number }>();

  for (const row of rows) {
    const rev = toNumber(row.revenue);
    const cogs = toNumber(row.cost);
    totalRevenue += rev;
    totalCogs += cogs;
    const p = byProduct.get(row.product) ?? { revenue: 0, cogs: 0 };
    p.revenue += rev;
    p.cogs += cogs;
    byProduct.set(row.product, p);
  }

  const productIds = [...byProduct.keys()];
  const products = productIds.length
    ? await bag.catalog_inventory_product.findMany({
        where: { id: { in: productIds } },
        select: { id: true, name: true },
      })
    : [];
  const productName = new Map(products.map((p) => [p.id, p.name]));

  const grossProfit = totalRevenue - totalCogs;

  return {
    period: { from: from.toISOString(), to: to.toISOString() },
    revenue: fmt(totalRevenue),
    cogs: fmt(totalCogs),
    grossProfit: fmt(grossProfit),
    marginPct: marginPct(totalRevenue, grossProfit),
    byProduct: [...byProduct.entries()]
      .map(([id, v]) => {
        const profit = v.revenue - v.cogs;
        return {
          productId: id,
          productName: productName.get(id) ?? '',
          revenue: fmt(v.revenue),
          cogs: fmt(v.cogs),
          profit: fmt(profit),
          marginPct: marginPct(v.revenue, profit),
        };
      })
      .sort((a, b) => Number(b.revenue) - Number(a.revenue)),
  };
}
