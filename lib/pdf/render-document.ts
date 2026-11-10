import '@/configs/inventory/catalogs/product';
import '@/configs/inventory/registers/product-price';
import '@/configs/inventory/catalogs/warehouse';
import '@/configs/sales/catalogs/customer';
import '@/configs/sales/catalogs/price-agreement';
import '@/configs/sales/catalogs/price-type';
import '@/configs/sales/documents/sales-invoice';
import '@/configs/sales/documents/payment-received';
import '@/configs/purchases/catalogs/supplier';
import '@/configs/purchases/documents/purchase-invoice';
import '@/configs/purchases/documents/payment-sent';

import {
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
import type { AppContext } from '@/platform/auth/current-context';
import { withTenant } from '@/platform/db/tenant-context';
import { PDFDocument, StandardFonts, rgb } from 'pdf-lib';

export async function renderSalesInvoicePdf(id: string, ctx: AppContext): Promise<Uint8Array> {
  const tenant = ctx.tenant;
  if (!tenant) throw new Error('NO_TENANT_SELECTED');

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
    const prods = await tx.catalog_inventory_product.findMany({
      where: { id: { in: prodIds as string[] }, tenantId: tenant.id },
    });
    const nameById = new Map(prods.map((p) => [p.id, p.name]));
    const linesData = ls.map((l) => ({
      product: nameById.get(l.product) ?? l.product,
      quantity: l.quantity,
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

  if (!invoice) throw new Error('NOT_FOUND');

  const pdf = await PDFDocument.create();
  const font = await pdf.embedFont(StandardFonts.Helvetica);
  const bold = await pdf.embedFont(StandardFonts.HelveticaBold);
  const page = pdf.addPage();
  const { width, height } = page.getSize();
  const margin = 48;
  let y = height - margin;

  page.drawText(tenant.name, {
    x: margin,
    y,
    size: 18,
    font: bold,
    color: rgb(0.1, 0.1, 0.1),
  });
  y -= 28;
  page.drawText(`Invoice ${invoice.number}`, {
    x: margin,
    y,
    size: 14,
    font: bold,
  });
  y -= 18;
  page.drawText(`Date: ${invoice.date?.toISOString().slice(0, 10) ?? '—'}`, {
    x: margin,
    y,
    size: 11,
    font,
  });
  y -= 14;
  page.drawText(`Status: ${invoice.status}`, { x: margin, y, size: 11, font });
  y -= 14;
  page.drawText(`Customer: ${customerName}`, {
    x: margin,
    y,
    size: 11,
    font,
  });
  y -= 24;

  page.drawText('Product', { x: margin, y, size: 11, font: bold });
  page.drawText('Qty', { x: margin + 260, y, size: 11, font: bold });
  page.drawText('Price', { x: margin + 320, y, size: 11, font: bold });
  page.drawText('Total', { x: margin + 400, y, size: 11, font: bold });
  y -= 4;
  page.drawLine({
    start: { x: margin, y },
    end: { x: width - margin, y },
    thickness: 0.5,
    color: rgb(0.4, 0.4, 0.4),
  });
  y -= 14;

  const currency = (tenant as { currency?: string }).currency ?? 'USD';
  const fmt = (n: number) => `${currency} ${n.toFixed(2)}`;
  let grand = 0;
  for (const l of lines) {
    if (y < margin + 40) {
      y = height - margin;
      pdf.addPage();
    }
    const total = l.quantity * l.price;
    grand += total;
    page.drawText(l.product, { x: margin, y, size: 10, font });
    page.drawText(String(l.quantity), {
      x: margin + 260,
      y,
      size: 10,
      font,
    });
    page.drawText(fmt(l.price), { x: margin + 320, y, size: 10, font });
    page.drawText(fmt(total), { x: margin + 400, y, size: 10, font });
    y -= 14;
  }

  y -= 10;
  page.drawText(`Grand total: ${fmt(grand)}`, {
    x: margin + 260,
    y,
    size: 12,
    font: bold,
  });

  return new Uint8Array(await pdf.save());
}

export async function renderPaymentReceivedPdf(id: string, ctx: AppContext): Promise<Uint8Array> {
  const tenant = ctx.tenant;
  if (!tenant) throw new Error('NO_TENANT_SELECTED');

  const { payment, customerName } = await withTenant(tenant.id, async (tx) => {
    const p = await tx.document_sales_payment_received.findFirst({
      where: { id, tenantId: tenant.id, deletedAt: null },
    });
    if (!p) return { payment: null, customerName: '' };
    const c = await tx.catalog_sales_customer.findFirst({
      where: { id: p.customer, tenantId: tenant.id },
    });
    return { payment: p, customerName: c?.name ?? p.customer };
  });

  if (!payment) throw new Error('NOT_FOUND');

  const currency = (tenant as { currency?: string }).currency ?? 'USD';
  const amountNum = Number(payment.amount);

  const b = await startPrintForm();
  heading(b, tenant.name);
  subheading(b, `Cash Receipt Order (PKO) ${payment.number ?? ''}`);
  metaRow(b, 'Date', payment.date?.toISOString().slice(0, 10) ?? '—');
  metaRow(b, 'Status', String(payment.status));
  metaRow(b, 'Received from', customerName);
  metaRow(b, 'Amount', formatMoney(currency, amountNum));
  if (payment.note) metaRow(b, 'Basis', String(payment.note));

  b.y -= 12;
  b.page.drawText('In words (amount): ________________________________', {
    x: b.margin,
    y: b.y,
    size: 10,
    font: b.font,
  });
  b.y -= 14;

  signatureBlock(b, { director: 'Director', accountant: 'Cashier' });

  return new Uint8Array(await b.pdf.save());
}

export async function renderPurchaseInvoicePdf(id: string, ctx: AppContext): Promise<Uint8Array> {
  const tenant = ctx.tenant;
  if (!tenant) throw new Error('NO_TENANT_SELECTED');

  const { invoice, lines, supplierName } = await withTenant(tenant.id, async (tx) => {
    const inv = await tx.document_purchases_invoice.findFirst({
      where: { id, tenantId: tenant.id, deletedAt: null },
    });
    if (!inv) return { invoice: null, lines: [], supplierName: '' };
    const ls = await tx.documentLine_purchases_invoice_items.findMany({
      where: { documentId: id, tenantId: tenant.id },
      orderBy: { sequence: 'asc' },
    });
    const prodIds = Array.from(new Set(ls.map((l) => l.product)));
    const prods =
      prodIds.length > 0
        ? await tx.catalog_inventory_product.findMany({
            where: {
              id: { in: prodIds as string[] },
              tenantId: tenant.id,
            },
          })
        : [];
    const nameById = new Map(prods.map((p) => [p.id, p.name]));
    const linesData = ls.map((l) => ({
      product: nameById.get(l.product) ?? l.product,
      quantity: Number(l.quantity),
      price: Number(l.price),
    }));
    const supplier = await tx.catalog_purchases_supplier.findFirst({
      where: { id: inv.supplier, tenantId: tenant.id },
    });
    return {
      invoice: inv,
      lines: linesData,
      supplierName: supplier?.name ?? inv.supplier,
    };
  });

  if (!invoice) throw new Error('NOT_FOUND');

  const currency = (tenant as { currency?: string }).currency ?? 'USD';

  const b = await startPrintForm();
  heading(b, tenant.name);
  subheading(b, `Goods Waybill (TORG-12) ${invoice.number ?? ''}`);
  metaRow(b, 'Date', invoice.date?.toISOString().slice(0, 10) ?? '—');
  metaRow(b, 'Status', String(invoice.status));
  metaRow(b, 'Supplier', supplierName);
  b.y -= 6;

  const cols = [
    { header: '#', offset: 0 },
    { header: 'Product', offset: 30 },
    { header: 'Qty', offset: 280 },
    { header: 'Price', offset: 340 },
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
  b.page.drawText(`Grand total: ${formatMoney(currency, grand)}`, {
    x: b.margin + 280,
    y: b.y,
    size: 12,
    font: b.bold,
  });
  b.y -= 14;

  signatureBlock(b, { director: 'Received by', accountant: 'Shipped by' });

  return new Uint8Array(await b.pdf.save());
}

export async function renderPaymentSentPdf(id: string, ctx: AppContext): Promise<Uint8Array> {
  const tenant = ctx.tenant;
  if (!tenant) throw new Error('NO_TENANT_SELECTED');

  const { payment, supplierName } = await withTenant(tenant.id, async (tx) => {
    const p = await tx.document_purchases_payment_sent.findFirst({
      where: { id, tenantId: tenant.id, deletedAt: null },
    });
    if (!p) return { payment: null, supplierName: '' };
    const s = await tx.catalog_purchases_supplier.findFirst({
      where: { id: p.supplier, tenantId: tenant.id },
    });
    return { payment: p, supplierName: s?.name ?? p.supplier };
  });

  if (!payment) throw new Error('NOT_FOUND');

  const currency = (tenant as { currency?: string }).currency ?? 'USD';
  const amountNum = Number(payment.amount);

  const b = await startPrintForm();
  heading(b, tenant.name);
  subheading(b, `Cash Expense Order (RKO) ${payment.number ?? ''}`);
  metaRow(b, 'Date', payment.date?.toISOString().slice(0, 10) ?? '—');
  metaRow(b, 'Status', String(payment.status));
  metaRow(b, 'Paid to', supplierName);
  metaRow(b, 'Amount', formatMoney(currency, amountNum));
  if (payment.note) metaRow(b, 'Basis', String(payment.note));

  b.y -= 12;
  b.page.drawText('In words (amount): ________________________________', {
    x: b.margin,
    y: b.y,
    size: 10,
    font: b.font,
  });
  b.y -= 14;

  signatureBlock(b, { director: 'Director', accountant: 'Cashier' });

  return new Uint8Array(await b.pdf.save());
}
