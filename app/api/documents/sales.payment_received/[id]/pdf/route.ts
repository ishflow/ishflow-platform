import '@/configs/inventory/registers/product-price';
import '@/configs/sales/catalogs/customer';
import '@/configs/sales/catalogs/price-agreement';
import '@/configs/sales/catalogs/price-type';
import '@/configs/sales/documents/payment-received';

import { renderPaymentReceivedPdf } from '@/lib/pdf/render-document';
import { requireTenantContext } from '@/platform/auth/current-context';
import type { NextRequest } from 'next/server';

/**
 * ПКО — Приходный Кассовый Ордер (Cash Receipt Order)
 *
 * Standard 1C print form for sales.payment_received: acknowledges receipt of
 * money from a customer against an invoice or as prepayment.
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
    bytes = await renderPaymentReceivedPdf(id, ctx);
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
      'Content-Disposition': `attachment; filename="PKO-${id}.pdf"`,
    },
  });
}
