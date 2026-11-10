import { renderPaymentSentPdf } from '@/lib/pdf/render-document';
import { requireTenantContext } from '@/platform/auth/current-context';
import type { NextRequest } from 'next/server';

export const dynamic = 'force-dynamic';

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

  const bodyInit = bytes as unknown as BodyInit;
  return new Response(bodyInit, {
    headers: {
      'Content-Type': 'application/pdf',
      'Content-Disposition': `inline; filename="RKO-${id}.pdf"`,
    },
  });
}
