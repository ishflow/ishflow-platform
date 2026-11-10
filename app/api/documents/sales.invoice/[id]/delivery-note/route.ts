import '@/configs/inventory/catalogs/product';
import '@/configs/inventory/registers/product-price';
import '@/configs/sales/catalogs/customer';
import '@/configs/sales/catalogs/price-agreement';
import '@/configs/sales/catalogs/price-type';
import '@/configs/sales/documents/sales-invoice';

import {
  finishPrintForm,
  heading,
  metaRow,
  signatureBlock,
  startPrintForm,
  subheading,
  tableHeader,
  tableRow,
} from '@/lib/pdf-print-form';
import { requireTenantContext } from '@/platform/auth/current-context';
import { withTenant } from '@/platform/db/tenant-context';
import type { NextRequest } from 'next/server';

/**
 * Delivery Note (Накладная) — goods-movement variant of the sales invoice.
 *
 * Same line items as the invoice but without price or total columns. Used when
 * shipping physical goods to the customer; the receiver signs to confirm
 * receipt. Complements the full ТОРГ-12 on the purchases side.
 */
export async function GET(
  _req: Request | NextRequest,
  ctxArg: { params: Promise<{ id: string }> },
) {
  const { id } = await ctxArg.params;
  let ctx: Awaited<ReturnType<typeof requireTenantContext>>;
  try {
    ctx = await requireTenantContext();
  } catch {
    return new Response('unauthorized', { status: 401 });
  }
  const tenant = ctx.tenant;
  if (!tenant) return new Response('unauthorized', { status: 401 });

  const { invoice, lines, customerName } = await withTenant(tenant.id, async (tx) => {
    const inv = await tx.document_sales_invoice.findFirst({
      where: { id, tenantId: tenant.id, deletedAt: null },
    });
    if (!inv) return { invoice: null, lines: [], customerName: '' };
    const ls = await tx.documentLine_sales_invoice_items.findMany({
      where: { documentId: id, tenantId: tenant.id },
      orderBy: { sequence: 'asc' },
    });
    const prodIds = Array.from(new Set(ls.map((l) => l.product)));
    const prods =
      prodIds.length > 0
        ? await tx.catalog_inventory_product.findMany({
            where: { id: { in: prodIds as string[] }, tenantId: tenant.id },
          })
        : [];
    const nameById = new Map(prods.map((p) => [p.id, p.name]));
    const linesData = ls.map((l) => ({
      product: nameById.get(l.product) ?? l.product,
      quantity: Number(l.quantity),
    }));
    const customer = await tx.catalog_sales_customer.findFirst({
      where: { id: inv.customer, tenantId: tenant.id },
    });
    return {
      invoice: inv,
      lines: linesData,
      customerName: customer?.name ?? inv.customer,
    };
  });

  if (!invoice) return new Response('not found', { status: 404 });

  const b = await startPrintForm();
  heading(b, tenant.name);
  subheading(b, `Delivery Note ${invoice.number ?? ''}`);
  metaRow(b, 'Date', invoice.date?.toISOString().slice(0, 10) ?? '—');
  metaRow(b, 'Status', String(invoice.status));
  metaRow(b, 'Consignee', customerName);
  b.y -= 6;

  const cols = [
    { header: '#', offset: 0 },
    { header: 'Product', offset: 30 },
    { header: 'Qty', offset: 380 },
  ];
  tableHeader(b, cols);

  let totalQty = 0;
  lines.forEach((l, idx) => {
    totalQty += l.quantity;
    tableRow(b, [
      { value: String(idx + 1), offset: 0 },
      { value: l.product, offset: 30 },
      { value: String(l.quantity), offset: 380 },
    ]);
  });

  b.y -= 6;
  b.page.drawText(`Total quantity: ${totalQty}`, {
    x: b.margin + 260,
    y: b.y,
    size: 11,
    font: b.bold,
  });
  b.y -= 14;

  signatureBlock(b, { director: 'Shipped by', accountant: 'Received by' });

  return finishPrintForm(b, `DeliveryNote_${invoice.number ?? invoice.id.slice(0, 8)}`);
}
