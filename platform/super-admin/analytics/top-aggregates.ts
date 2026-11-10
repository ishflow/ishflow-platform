/**
 * Cross-tenant top products / customers for the Super Admin analytics page.
 *
 * Privacy: we never expose tenant names or individual customer/product
 * names. Instead we hash the source name and surface aggregate counts
 * (#tenants, #invoices, units, revenue). Per-tenant detail stays inside
 * the per-tenant SA console.
 *
 * Driven by `Movement_sales_sale`, which is the canonical post-sale
 * movement and already aggregated by counterparty + product.
 */

import { createHash } from 'node:crypto';
import { withBypass } from '@/platform/db/tenant-context';

export interface TopProductRow {
  productHash: string;
  tenants: number;
  units: number;
  revenueByCurrency: Record<string, number>;
}

export interface TopCustomerRow {
  customerHash: string;
  invoices: number;
  revenueByCurrency: Record<string, number>;
}

function shortHash(input: string, salt = '1canalog-analytics'): string {
  return createHash('sha256').update(`${salt}:${input}`).digest('hex').slice(0, 12);
}

const TOP_N = 10;

export async function computeTopProducts(): Promise<TopProductRow[]> {
  return withBypass(async (tx) => {
    const rows = await tx.movement_sales_sale.groupBy({
      by: ['tenantId', 'product'],
      where: { active: true },
      _sum: { quantity: true, revenue: true },
    });
    // Aggregate across tenants → product hash; need tenant currency lookup.
    const tenantIds = Array.from(new Set(rows.map((r) => r.tenantId)));
    const tenants = await tx.tenant.findMany({
      where: { id: { in: tenantIds } },
      select: { id: true, currency: true },
    });
    const currencyOf = new Map(tenants.map((t) => [t.id, t.currency]));

    const byProduct = new Map<
      string,
      { tenants: Set<string>; units: number; revenueByCurrency: Map<string, number> }
    >();
    for (const r of rows) {
      const hash = shortHash(r.product);
      let entry = byProduct.get(hash);
      if (!entry) {
        entry = { tenants: new Set(), units: 0, revenueByCurrency: new Map() };
        byProduct.set(hash, entry);
      }
      entry.tenants.add(r.tenantId);
      entry.units += r._sum.quantity ?? 0;
      const cur = currencyOf.get(r.tenantId) ?? 'USD';
      entry.revenueByCurrency.set(
        cur,
        (entry.revenueByCurrency.get(cur) ?? 0) + Number(r._sum.revenue ?? 0),
      );
    }

    return Array.from(byProduct.entries())
      .map(([productHash, e]) => ({
        productHash,
        tenants: e.tenants.size,
        units: e.units,
        revenueByCurrency: Object.fromEntries(e.revenueByCurrency),
      }))
      .sort((a, b) => b.units - a.units)
      .slice(0, TOP_N);
  });
}

export async function computeTopCustomers(): Promise<TopCustomerRow[]> {
  return withBypass(async (tx) => {
    const rows = await tx.movement_sales_sale.groupBy({
      by: ['tenantId', 'counterparty'],
      where: { active: true },
      _sum: { revenue: true },
      _count: { _all: true },
    });
    // Each customer hash is tenant-scoped, so revenue stays in that tenant's
    // currency — but rows from different tenants must not be summed across
    // currencies. Bucket by currency like top-products does.
    const tenantIds = Array.from(new Set(rows.map((r) => r.tenantId)));
    const tenants = await tx.tenant.findMany({
      where: { id: { in: tenantIds } },
      select: { id: true, currency: true },
    });
    const currencyOf = new Map(tenants.map((t) => [t.id, t.currency]));

    const byCustomer = new Map<
      string,
      { invoices: number; revenueByCurrency: Map<string, number> }
    >();
    for (const r of rows) {
      // Hash counterparty + tenant to ensure that the same physical customer
      // name in two tenants never collides (no PII leak).
      const hash = shortHash(`${r.tenantId}:${r.counterparty}`);
      let entry = byCustomer.get(hash);
      if (!entry) {
        entry = { invoices: 0, revenueByCurrency: new Map() };
        byCustomer.set(hash, entry);
      }
      entry.invoices += r._count?._all ?? 0;
      const cur = currencyOf.get(r.tenantId) ?? 'USD';
      entry.revenueByCurrency.set(
        cur,
        (entry.revenueByCurrency.get(cur) ?? 0) + Number(r._sum.revenue ?? 0),
      );
    }
    return Array.from(byCustomer.entries())
      .map(([customerHash, e]) => ({
        customerHash,
        invoices: e.invoices,
        revenueByCurrency: Object.fromEntries(e.revenueByCurrency),
      }))
      .sort((a, b) => sumRevenue(b.revenueByCurrency) - sumRevenue(a.revenueByCurrency))
      .slice(0, TOP_N);
  });
}

/** Rank helper: total magnitude across currencies (ordering only, not displayed). */
function sumRevenue(byCurrency: Record<string, number>): number {
  let total = 0;
  for (const v of Object.values(byCurrency)) total += v;
  return total;
}
