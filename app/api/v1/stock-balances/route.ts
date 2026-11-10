/**
 * GET /api/v1/stock-balances
 *
 * Public read of the `inventory.stock_balance` accumulation register snapshot.
 * Rows come straight from `Movement_inventory_stock_balance` via `withTenant`
 * so RLS scopes them to the API key's tenant.
 *
 * Query params:
 *   - productId     (uuid)   optional — filter to a single product
 *   - warehouseId   (uuid)   optional — filter to a single warehouse
 *   - page          (>=1)    default 1
 *   - pageSize      (1..100) default 50
 *
 * Note: the underlying columns are `product` and `warehouse` (uuid refs); the
 * public query params keep the conventional `*Id` suffix and we map at the
 * `where` boundary so the wire contract stays predictable.
 */

import { ApiKeyAuthError } from '@/platform/auth/current-context';
import { withTenant } from '@/platform/db/tenant-context';
import { requireApiKey } from '../_lib/auth';
import { respondData, respondError } from '../_lib/respond';
import { serializeRow } from '../_lib/serialize';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

type StockBalanceDelegate = {
  findMany: (args: object) => Promise<Array<Record<string, unknown>>>;
  count: (args: object) => Promise<number>;
};

export async function GET(req: Request) {
  try {
    const ctx = await requireApiKey(req, 'read');
    const url = new URL(req.url);
    const productId = url.searchParams.get('productId') ?? undefined;
    const warehouseId = url.searchParams.get('warehouseId') ?? undefined;
    const page = Math.max(1, Number(url.searchParams.get('page')) || 1);
    const pageSize = Math.min(100, Math.max(1, Number(url.searchParams.get('pageSize')) || 50));

    if (!ctx.tenant) {
      return respondError('internal_error', 'no tenant in context', 500);
    }

    const where: Record<string, unknown> = {};
    if (productId) where.product = productId;
    if (warehouseId) where.warehouse = warehouseId;

    const { rows, total } = await withTenant(ctx.tenant.id, async (tx) => {
      const delegate = (tx as unknown as Record<string, StockBalanceDelegate | undefined>)
        .movement_inventory_stock_balance;
      if (!delegate) {
        throw new Error('stock_balance delegate missing on Prisma client');
      }
      const [rows, total] = await Promise.all([
        delegate.findMany({
          where,
          orderBy: [{ product: 'asc' }, { warehouse: 'asc' }],
          skip: (page - 1) * pageSize,
          take: pageSize,
        }),
        delegate.count({ where }),
      ]);
      return { rows, total };
    });

    return respondData(
      rows.map((r) => serializeRow(r)),
      { page, pageSize, total },
    );
  } catch (e) {
    if (e instanceof ApiKeyAuthError) {
      return respondError(e.code, e.message, e.status);
    }
    const msg = (e as Error)?.message ?? 'Unexpected error';
    process.stderr.write(`[/api/v1/stock-balances] ${msg}\n`);
    return respondError('internal_error', 'Unexpected error', 500);
  }
}
