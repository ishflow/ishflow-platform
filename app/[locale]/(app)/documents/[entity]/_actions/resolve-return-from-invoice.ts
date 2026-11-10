'use server';

import '@/configs';

import { requireTenantContext } from '@/platform/auth/current-context';
import { withTenant } from '@/platform/db/tenant-context';
import { z } from 'zod';

const Input = z.object({
  invoiceModule: z.enum(['sales', 'purchases']),
  invoiceId: z.string().uuid(),
});

export type ResolveReturnFromInvoiceResult = {
  counterparty: { id: string; label: string };
  warehouse: { id: string; label: string };
  lines: Array<{
    product: { id: string; label: string };
    quantity: number;
    price: number;
  }>;
};

/**
 * Resolve header + line data from an original invoice to seed a return
 * document's create form. Returns null on missing tenant, unknown invoice,
 * RLS reject, or any runtime error — the caller is a UX hint, not a hard
 * requirement, so we never surface as an unhandled rejection on the client.
 */
export async function resolveReturnFromInvoice(
  raw: unknown,
): Promise<ResolveReturnFromInvoiceResult | null> {
  const parsed = Input.safeParse(raw);
  if (!parsed.success) return null;
  const { invoiceModule, invoiceId } = parsed.data;

  try {
    const { tenant } = await requireTenantContext();
    if (!tenant?.id) return null;

    return await withTenant(tenant.id, async (tx) => {
      // biome-ignore lint/suspicious/noExplicitAny: prisma delegate not typed on tx generic
      const txAny = tx as any;
      if (invoiceModule === 'sales') {
        const inv = await txAny.document_sales_invoice.findUnique({
          where: { id: invoiceId },
          select: { id: true, customer: true, warehouse: true },
        });
        if (!inv) return null;
        const lines = (await txAny.documentLine_sales_invoice_items.findMany({
          where: { documentId: inv.id },
          orderBy: { sequence: 'asc' },
          select: { product: true, quantity: true, price: true },
        })) as Array<{ product: string; quantity: number; price: number }>;
        const productIds = Array.from(new Set(lines.map((l) => l.product)));
        const [c, w, products] = await Promise.all([
          txAny.catalog_sales_customer.findUnique({
            where: { id: inv.customer },
            select: { id: true, name: true },
          }),
          txAny.catalog_inventory_warehouse.findUnique({
            where: { id: inv.warehouse },
            select: { id: true, name: true },
          }),
          productIds.length
            ? (txAny.catalog_inventory_product.findMany({
                where: { id: { in: productIds } },
                select: { id: true, name: true },
              }) as Promise<Array<{ id: string; name: string }>>)
            : Promise.resolve([] as Array<{ id: string; name: string }>),
        ]);
        if (!c || !w) return null;
        const productLabel = new Map(
          (products as Array<{ id: string; name: string }>).map((p) => [p.id, p.name]),
        );
        return {
          counterparty: { id: c.id as string, label: c.name as string },
          warehouse: { id: w.id as string, label: w.name as string },
          lines: lines.map((l) => ({
            product: { id: l.product, label: productLabel.get(l.product) ?? l.product },
            quantity: Number(l.quantity),
            price: Number(l.price),
          })),
        };
      }

      // invoiceModule === 'purchases'
      const inv = await txAny.document_purchases_invoice.findUnique({
        where: { id: invoiceId },
        select: { id: true, supplier: true, warehouse: true },
      });
      if (!inv) return null;
      const lines = (await txAny.documentLine_purchases_invoice_items.findMany({
        where: { documentId: inv.id },
        orderBy: { sequence: 'asc' },
        select: { product: true, quantity: true, price: true },
      })) as Array<{ product: string; quantity: number; price: number }>;
      const productIds = Array.from(new Set(lines.map((l) => l.product)));
      const [s, w, products] = await Promise.all([
        txAny.catalog_purchases_supplier.findUnique({
          where: { id: inv.supplier },
          select: { id: true, name: true },
        }),
        txAny.catalog_inventory_warehouse.findUnique({
          where: { id: inv.warehouse },
          select: { id: true, name: true },
        }),
        productIds.length
          ? (txAny.catalog_inventory_product.findMany({
              where: { id: { in: productIds } },
              select: { id: true, name: true },
            }) as Promise<Array<{ id: string; name: string }>>)
          : Promise.resolve([] as Array<{ id: string; name: string }>),
      ]);
      if (!s || !w) return null;
      const productLabel = new Map(
        (products as Array<{ id: string; name: string }>).map((p) => [p.id, p.name]),
      );
      return {
        counterparty: { id: s.id as string, label: s.name as string },
        warehouse: { id: w.id as string, label: w.name as string },
        lines: lines.map((l) => ({
          product: { id: l.product, label: productLabel.get(l.product) ?? l.product },
          quantity: Number(l.quantity),
          price: Number(l.price),
        })),
      };
    });
  } catch {
    return null;
  }
}
