import { formatMoney } from '@/lib/format-money';
import { withTenant } from '@/platform/db/tenant-context';
import { thisMonthSalesTotal } from '@/platform/engine/dashboard-queries';
import { defineDashboardWidget } from '@/platform/metadata';

function initials(name: string): string {
  const parts = name.trim().split(/\s+/);
  if (parts.length === 0) return '?';
  if (parts.length === 1) return (parts[0] ?? '?').slice(0, 2).toUpperCase();
  return `${parts[0]?.[0] ?? ''}${parts[1]?.[0] ?? ''}`.toUpperCase();
}

export type TopCustomerItem = {
  initials: string;
  name: string;
  amount: string;
  percentage: number;
};

export type TopCustomersPayload = {
  customers: TopCustomerItem[];
  customerCount: number;
  changePct: number;
};

defineDashboardWidget<TopCustomersPayload>({
  id: 'top-customers',
  title: { en: 'Top Customers', ru: 'Топ клиентов', tr: 'En İyi Müşteriler' },
  layout: 'half-row',
  renderer: 'top-customers',
  permissions: { read: 'tenant' },
  requires: 'sales.invoice:read',
  async loader(ctx) {
    if (!ctx.tenant.id) {
      return { customers: [], customerCount: 0, changePct: 0 };
    }
    const queries = { tenant: { id: ctx.tenant.id } } as Parameters<typeof thisMonthSalesTotal>[0];
    const ms = await thisMonthSalesTotal(queries);

    const { customers, customerCount } = await withTenant(ctx.tenant.id, async (tx) => {
      const allDocs = await tx.document_sales_invoice.findMany({
        where: { deletedAt: null },
        select: { id: true, customer: true },
      });
      const docToCustomer = new Map(allDocs.map((d) => [d.id, d.customer]));
      const allLineSums = await tx.documentLine_sales_invoice_items.findMany({
        select: { documentId: true, quantity: true, price: true },
      });
      const totals = new Map<string, number>();
      for (const l of allLineSums) {
        const cust = docToCustomer.get(l.documentId);
        if (!cust) continue;
        totals.set(cust, (totals.get(cust) ?? 0) + Number(l.price) * l.quantity);
      }
      const ids = Array.from(totals.keys());
      const rows = ids.length
        ? await tx.catalog_sales_customer.findMany({
            where: { id: { in: ids } },
            select: { id: true, name: true },
          })
        : [];
      const nameMap = new Map(rows.map((c) => [c.id, c.name]));
      const totalCustomers = await tx.catalog_sales_customer.count({
        where: { deletedAt: null },
      });
      const totalRevenue = Array.from(totals.values()).reduce((a, b) => a + b, 0);
      const sorted = Array.from(totals.entries())
        .sort(([, a], [, b]) => b - a)
        .slice(0, 5);
      const list: TopCustomerItem[] = sorted.map(([cust, amount]) => {
        const name = nameMap.get(cust) ?? cust.slice(0, 8);
        const pct = totalRevenue > 0 ? Math.round((amount / totalRevenue) * 100) : 0;
        return {
          initials: initials(name),
          name,
          amount: formatMoney(amount, ctx.tenant.locale, ctx.tenant.currency),
          percentage: pct,
        };
      });
      return { customers: list, customerCount: totalCustomers };
    });

    return {
      customers,
      customerCount,
      changePct: ms.delta,
    };
  },
});
