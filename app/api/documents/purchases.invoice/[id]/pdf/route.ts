import '@/configs/inventory/catalogs/product';
import '@/configs/inventory/registers/product-price';
import '@/configs/inventory/catalogs/warehouse';
import '@/configs/purchases/catalogs/supplier';
import '@/configs/purchases/documents/purchase-invoice';

import { renderPurchaseInvoicePdf } from '@/lib/pdf/render-document';
import { requireTenantContext } from '@/platform/auth/current-context';
import type { NextRequest } from 'next/server';

/**
 * ТОРГ-12 — Товарная накладная (Goods Waybill / Delivery Note)
 *
 * Standard 1C print form for purchases.invoice: the supplier's itemized
 * goods list plus a signature block for receipt confirmation.
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

  let bytes: Uint8Array;
  try {
    bytes = await renderPurchaseInvoicePdf(id, ctx);
  } catch (e) {
    if (e instanceof Error && e.message === 'NOT_FOUND') {
      return new Response('not found', { status: 404 });
    }
    throw e;
  }

  const bodyInit = new Uint8Array(bytes) as unknown as BodyInit;
  return new Response(bodyInit, {
    status: 200,
    headers: {
      'Content-Type': 'application/pdf',
      'Content-Disposition': `attachment; filename="TORG12-${id}.pdf"`,
    },
  });
}
