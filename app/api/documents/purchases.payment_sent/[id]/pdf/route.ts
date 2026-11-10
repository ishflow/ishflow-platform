import '@/configs/purchases/catalogs/supplier';
import '@/configs/purchases/documents/payment-sent';

import { renderPaymentSentPdf } from '@/lib/pdf/render-document';
import { requireTenantContext } from '@/platform/auth/current-context';
import type { NextRequest } from 'next/server';

/**
 * РКО — Расходный Кассовый Ордер (Cash Expense Order)
 *
 * Standard 1C print form for purchases.payment_sent: acknowledges an
 * outbound payment from the tenant to a supplier.
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
    bytes = await renderPaymentSentPdf(id, ctx);
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
      'Content-Disposition': `attachment; filename="RKO-${id}.pdf"`,
    },
  });
}
