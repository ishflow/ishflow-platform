import { formatMoney } from '@/lib/format-money';
import { withTenant } from '@/platform/db/tenant-context';
import { defineDashboardWidget } from '@/platform/metadata';

export type RecentInvoiceItem = {
  id: string;
  docNo: string;
  partnerName: string;
  amount: string;
  status: { label: string; tone: 'success' | 'warning' | 'danger' | 'neutral' };
  date: string;
};

export type RecentInvoicesPayload = {
  invoices: RecentInvoiceItem[];
};

function statusTone(s: string): 'success' | 'warning' | 'danger' | 'neutral' {
  if (s === 'POSTED') return 'success';
  if (s === 'FAILED') return 'danger';
  return 'warning';
}

defineDashboardWidget<RecentInvoicesPayload>({
  id: 'recent-invoices',
  title: { en: 'Recent Invoices', ru: 'Последние счета', tr: 'Son Faturalar' },
  layout: 'full-row',
  renderer: 'recent-invoices',
  permissions: { read: 'tenant' },
  requires: ['sales.invoice:read', 'purchases.invoice:read'],
  async loader(ctx) {
    if (!ctx.tenant.id) {
      return { invoices: [] };
    }
    const invoices = await withTenant(ctx.tenant.id, async (tx) => {
      const docs = await tx.document_sales_invoice.findMany({
        where: { deletedAt: null },
        orderBy: { createdAt: 'desc' },
        take: 10,
        select: {
          id: true,
          number: true,
          date: true,
          customer: true,
          status: true,
        },
      });
      if (docs.length === 0) return [] as RecentInvoiceItem[];
      const ids = docs.map((d) => d.id);
      const custIds = Array.from(new Set(docs.map((d) => d.customer)));
      const [customers, lineSums] = await Promise.all([
        tx.catalog_sales_customer.findMany({
          where: { id: { in: custIds } },
          select: { id: true, name: true },
        }),
        tx.documentLine_sales_invoice_items.findMany({
          where: { documentId: { in: ids } },
          select: { documentId: true, quantity: true, price: true },
        }),
      ]);
      const custMap = new Map(customers.map((c) => [c.id, c.name]));
      const sumMap = new Map<string, number>();
      for (const l of lineSums) {
        sumMap.set(l.documentId, (sumMap.get(l.documentId) ?? 0) + Number(l.price) * l.quantity);
      }
      const fmtDate = (d: Date) =>
        new Intl.DateTimeFormat(ctx.tenant.locale, {
          day: 'numeric',
          month: 'short',
          year: 'numeric',
        }).format(d);
      return docs.map<RecentInvoiceItem>((inv) => ({
        id: inv.id,
        docNo: inv.number,
        partnerName: custMap.get(inv.customer) ?? inv.customer.slice(0, 8),
        amount: formatMoney(sumMap.get(inv.id) ?? 0, ctx.tenant.locale, ctx.tenant.currency),
        status: { label: inv.status, tone: statusTone(inv.status) },
        date: fmtDate(inv.date),
      }));
    });
    return { invoices };
  },
});
