import '@/configs/purchases/documents/payment-sent';
import '@/configs/purchases/documents/purchase-invoice';
import '@/configs/sales/documents/payment-received';
import '@/configs/sales/documents/sales-invoice';
// Posting + prePost validators reach into accumulation/information registers
// via `ctx.register('<id>')`. The registry is populated by side-effect
// imports — without these the posting transaction throws
// `accumulation register "..." not registered`. Mirrors the web routes.
import '@/configs/inventory/registers/stock-balance';
import '@/configs/inventory/registers/product-price';
import '@/configs/purchases/registers/accounts-payable';
import '@/configs/sales/registers/accounts-receivable';
import '@/configs/sales/registers/sale';

import { requireTenantContext } from '@/platform/auth/current-context';
import { postDocument, resolveIdempotency, storeIdempotency } from '@/platform/engine';
import {
  InvalidStatusError,
  NotFoundError,
  PermissionDeniedError,
  PlanLimitError,
  PostingValidationError,
} from '@/platform/engine/errors';
import { getRegistry } from '@/platform/metadata';
import { DocumentPostResponseSchema, DocumentTypeParamSchema } from '@ishflow/mobile-api-contract';
import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export async function POST(
  req: Request,
  ctx: { params: Promise<{ type: string; id: string }> },
): Promise<Response> {
  const { type, id } = await ctx.params;
  const parsed = DocumentTypeParamSchema.safeParse(type);
  if (!parsed.success) return NextResponse.json({ error: 'invalid type' }, { status: 400 });
  const config = getRegistry().document[parsed.data];
  if (!config) return NextResponse.json({ error: 'unknown type' }, { status: 404 });

  let app: Awaited<ReturnType<typeof requireTenantContext>>;
  try {
    app = await requireTenantContext();
  } catch {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  const idempotencyKey = req.headers.get('Idempotency-Key');
  if (!idempotencyKey) {
    return NextResponse.json({ error: 'Idempotency-Key header required' }, { status: 400 });
  }
  const existing = await resolveIdempotency(app.tenant.id, idempotencyKey).catch(() => null);
  if (existing && existing.resourceType === `${config.id}.post`) {
    return NextResponse.json(existing.responseBody, { status: existing.statusCode });
  }

  let result: Awaited<ReturnType<typeof postDocument>>;
  try {
    result = await postDocument(app, config, id);
  } catch (err) {
    // Engine raises typed errors for posting failures. Surface them as
    // structured JSON so the iOS app can show a toast instead of a 500
    // with an empty body. The validator's machine-readable `reason` (e.g.
    // `insufficientStock`, `belowCost`) is preserved as-is for client-side
    // i18n / mapping.
    if (err instanceof PostingValidationError) {
      return NextResponse.json(
        { error: 'posting_validation', reason: err.reason, configId: err.configId, id: err.id },
        { status: 400 },
      );
    }
    if (err instanceof InvalidStatusError) {
      return NextResponse.json(
        {
          error: 'invalid_status',
          configId: err.configId,
          id: err.id,
          currentStatus: err.currentStatus,
          op: err.op,
        },
        { status: 409 },
      );
    }
    if (err instanceof NotFoundError) {
      return NextResponse.json({ error: 'not_found' }, { status: 404 });
    }
    if (err instanceof PermissionDeniedError) {
      return NextResponse.json({ error: 'forbidden' }, { status: 403 });
    }
    if (err instanceof PlanLimitError) {
      return NextResponse.json(err.toJSON(), { status: 402 });
    }
    throw err;
  }
  const body = DocumentPostResponseSchema.parse(result);

  await storeIdempotency(app.tenant.id, idempotencyKey, {
    resourceType: `${config.id}.post`,
    resourceId: id,
    responseBody: body,
    statusCode: 200,
  });

  return NextResponse.json(body);
}
