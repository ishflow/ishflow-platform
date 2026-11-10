import '@/configs/inventory/catalogs/product';
import '@/configs/inventory/registers/product-price';
import '@/configs/inventory/catalogs/warehouse';
import '@/configs/sales/catalogs/customer';
import '@/configs/sales/catalogs/price-agreement';
import '@/configs/sales/catalogs/price-type';
import '@/configs/sales/documents/sales-invoice';

import {
  finishPrintForm,
  formatMoney,
  heading,
  horizontalRule,
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
 * Счёт на оплату — Invoice for Payment.
 *
 * Simpler print form than the full Schet-Faktura: customer-facing bill with
 * line items + grand total + bank transfer payment instructions. Used in
 * Russia / CIS as the de-facto "please pay this amount" document before the
 * goods / services are delivered.
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
      price: Number(l.price),
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

  const currency = (tenant as { currency?: string }).currency ?? 'USD';

  const b = await startPrintForm();
  heading(b, tenant.name);
  subheading(b, `Invoice for Payment ${invoice.number ?? ''}`);
  metaRow(b, 'Date', invoice.date?.toISOString().slice(0, 10) ?? '—');
  metaRow(b, 'Buyer', customerName);
  metaRow(b, 'Currency', currency);
  b.y -= 6;

  const cols = [
    { header: '#', offset: 0 },
    { header: 'Description', offset: 30 },
    { header: 'Qty', offset: 280 },
    { header: 'Unit price', offset: 340 },
    { header: 'Total', offset: 430 },
  ];
  tableHeader(b, cols);

  let grand = 0;
  lines.forEach((l, idx) => {
    const total = l.quantity * l.price;
    grand += total;
    tableRow(b, [
      { value: String(idx + 1), offset: 0 },
      { value: l.product, offset: 30 },
      { value: String(l.quantity), offset: 280 },
      { value: formatMoney(currency, l.price), offset: 340 },
      { value: formatMoney(currency, total), offset: 430 },
    ]);
  });

  horizontalRule(b);
  b.y -= 6;
  b.page.drawText(`Amount due: ${formatMoney(currency, grand)}`, {
    x: b.margin + 280,
    y: b.y,
    size: 12,
    font: b.bold,
  });
  b.y -= 20;

  b.page.drawText('Payment instructions: please transfer the amount above', {
    x: b.margin,
    y: b.y,
    size: 10,
    font: b.font,
  });
  b.y -= 14;
  b.page.drawText(
    `to ${tenant.name} quoting invoice number ${invoice.number ?? invoice.id.slice(0, 8)}.`,
    {
      x: b.margin,
      y: b.y,
      size: 10,
      font: b.font,
    },
  );

  signatureBlock(b, { director: 'Director', accountant: 'Chief accountant' });

  return finishPrintForm(b, `InvoiceForPayment_${invoice.number ?? invoice.id.slice(0, 8)}`);
}
