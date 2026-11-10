/**
 * Public API — `/api/v1/products/{id}`
 *
 * GET → fetch one product by id, `read` scope.
 *
 * Per the design spec we deliberately do NOT inline stock balances here.
 * Callers that need stock should hit `/api/v1/stock-balances?productId={id}`
 * (see T3.4). Keeping this endpoint single-purpose avoids fragile dynamic
 * Prisma delegate lookups and keeps the response shape predictable.
 *
 * The `import '@/configs/inventory/catalogs/product'` side-effect ensures the
 * product config is registered even on cold serverless instances.
 */

import '@/configs/inventory/catalogs/product';

import { ApiKeyAuthError } from '@/platform/auth/current-context';
import { getRecord } from '@/platform/engine/crud';
import {
  NotFoundError,
  PermissionDeniedError,
  ViewAsReadOnlyError,
} from '@/platform/engine/errors';
import { getRegistry } from '@/platform/metadata/registry';

import { requireApiKey } from '../../_lib/auth';
import { respondData, respondError } from '../../_lib/respond';
import { serializeRow } from '../../_lib/serialize';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

const PRODUCT_CONFIG_ID = 'inventory.product';

export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
): Promise<Response> {
  try {
    const ctx = await requireApiKey(req, 'read');
    const { id } = await params;

    const cfg = getRegistry().catalog[PRODUCT_CONFIG_ID];
    if (!cfg) {
      return respondError('internal_error', 'product config not registered', 500);
    }

    // `getRecord` throws NotFoundError for both genuine misses and scope
    // mismatches — both surface as 404 via `handleError`, which is the
    // correct behaviour for an external API (don't leak existence).
    const product = await getRecord(ctx, cfg, id);
    return respondData(serializeRow(product));
  } catch (e) {
    if (e instanceof ApiKeyAuthError) return respondError(e.code, e.message, e.status);
    if (e instanceof NotFoundError) return respondError('not_found', e.message, 404);
    if (e instanceof PermissionDeniedError || e instanceof ViewAsReadOnlyError) {
      return respondError('insufficient_scope', e.message, 403);
    }
    const msg = (e as Error)?.message ?? 'Unexpected error';
    process.stderr.write(`[/api/v1/products/[id]] ${msg}\n`);
    return respondError('internal_error', 'Unexpected error', 500);
  }
}
