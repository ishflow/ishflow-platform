import '@/configs/inventory/catalogs/product';
import '@/configs/inventory/registers/product-price';
import '@/configs/inventory/catalogs/warehouse';
import '@/configs/inventory/registers/stock-balance';
import '@/configs/purchases/documents/purchase-invoice';
import '@/configs/sales/documents/sales-invoice';
import '@/configs/sales/registers/sale';

import type { AppContext } from '@/platform/auth/current-context';
import { withBypass, withTenant } from '@/platform/db/tenant-context';
import { type DocumentConfig, getRegistry } from '@/platform/metadata';
import { replayPosting } from './posting';

/**
 * Wipe `movement_inventory_stock_balance` + `movement_sales_sale` for a single
 * tenant, then replay every POSTED purchase/sales invoice chronologically
 * through `replayPosting`. Safe to re-run (idempotent after the wipe).
 *
 * The caller must set env `BACKFILL_STOCK_COST=1` before invoking via CLI.
 */
export async function backfillStockCost(
  ctx: AppContext & { tenant: NonNullable<AppContext['tenant']> },
): Promise<{ tenantId: string; docsReplayed: number; movementCount: number }> {
  const tenantId = ctx.tenant.id;

  // Step 1: wipe both register tables for this tenant.
  // Use snake_case column names — these are the actual DB columns (@map("tenant_id")).
  await withBypass(async (tx) => {
    await tx.$executeRawUnsafe(
      'DELETE FROM movement_inventory_stock_balance WHERE tenant_id = $1::uuid',
      tenantId,
    );
    await tx.$executeRawUnsafe(
      'DELETE FROM movement_sales_sale WHERE tenant_id = $1::uuid',
      tenantId,
    );
  });

  // Step 2: resolve document configs from registry.
  const purchaseInvoiceCfg = getRegistry().document['purchases.invoice'];
  const salesInvoiceCfg = getRegistry().document['sales.invoice'];
  if (!purchaseInvoiceCfg || !salesInvoiceCfg) {
    throw new Error('backfillStockCost: purchases.invoice or sales.invoice config not registered');
  }

  // Step 3: collect all POSTED headers from both doc types.
  type Entry = { config: DocumentConfig; docId: string; date: Date; createdAt: Date };
  const entries: Entry[] = [];

  await withTenant(tenantId, async (tx) => {
    type Delegate = {
      findMany: (args: unknown) => Promise<Array<{ id: string; date: Date; createdAt: Date }>>;
    };
    const bag = tx as unknown as Record<string, Delegate | undefined>;

    const purchaseDelegate = bag.document_purchases_invoice;
    const salesDelegate = bag.document_sales_invoice;
    if (!purchaseDelegate || !salesDelegate) {
      throw new Error('backfillStockCost: document delegates missing on Prisma client');
    }

    const purchaseHeaders = await purchaseDelegate.findMany({
      where: { status: 'POSTED' },
      select: { id: true, date: true, createdAt: true },
    });
    for (const h of purchaseHeaders) {
      entries.push({
        config: purchaseInvoiceCfg,
        docId: h.id,
        date: h.date,
        createdAt: h.createdAt,
      });
    }

    const salesHeaders = await salesDelegate.findMany({
      where: { status: 'POSTED' },
      select: { id: true, date: true, createdAt: true },
    });
    for (const h of salesHeaders) {
      entries.push({ config: salesInvoiceCfg, docId: h.id, date: h.date, createdAt: h.createdAt });
    }
  });

  // Step 4: sort chronologically — by date, then by createdAt for ties.
  entries.sort((a, b) => {
    const dt = a.date.getTime() - b.date.getTime();
    if (dt !== 0) return dt;
    return a.createdAt.getTime() - b.createdAt.getTime();
  });

  // Step 5: replay each doc sequentially in order.
  let movementCount = 0;
  for (const e of entries) {
    await withTenant(tenantId, async (tx) => {
      type HeaderDelegate = {
        findUnique: (args: unknown) => Promise<Record<string, unknown> | null>;
      };
      type LineDelegate = { findMany: (args: unknown) => Promise<Array<Record<string, unknown>>> };
      const bag = tx as unknown as Record<string, HeaderDelegate | LineDelegate | undefined>;

      const headerKey = `document_${e.config.module}_${e.config.name}`;
      const headerDelegate = bag[headerKey] as HeaderDelegate | undefined;
      if (!headerDelegate) {
        throw new Error(`backfillStockCost: no Prisma delegate for ${headerKey}`);
      }

      const header = await headerDelegate.findUnique({ where: { id: e.docId } });
      if (!header) return; // doc deleted between fetch and replay — skip

      const lines: Record<string, Array<Record<string, unknown>>> = {};
      if (e.config.lines) {
        for (const section of Object.keys(e.config.lines)) {
          // posting.ts tries both documentLine_* and document_line_* keys
          const camelKey = `documentLine_${e.config.module}_${e.config.name}_${section}`;
          const snakeKey = `document_line_${e.config.module}_${e.config.name}_${section}`;
          const lineDelegate = (bag[camelKey] ?? bag[snakeKey]) as LineDelegate | undefined;
          if (!lineDelegate) continue;
          const rows = await lineDelegate.findMany({
            where: { documentId: e.docId },
            orderBy: { sequence: 'asc' },
          });
          lines[section] = rows;
        }
      }

      const doc: Record<string, unknown> & {
        lines?: Record<string, Array<Record<string, unknown>>>;
      } = Object.keys(lines).length > 0 ? { ...header, lines } : { ...header };

      const res = await replayPosting(tx, ctx, e.config, doc, e.docId);
      movementCount += res.movementCount;
    });
  }

  return { tenantId, docsReplayed: entries.length, movementCount };
}
