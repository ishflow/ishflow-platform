import '@/configs/inventory/catalogs/product';
import '@/configs/inventory/registers/product-price';
import '@/configs/inventory/catalogs/warehouse';
import '@/configs/inventory/registers/stock-balance';
import '@/configs/purchases/catalogs/supplier';
import '@/configs/purchases/documents/purchase-invoice';
import '@/configs/purchases/registers/accounts-payable';
import '@/configs/sales/catalogs/customer';
import '@/configs/sales/catalogs/price-agreement';
import '@/configs/sales/catalogs/price-type';
import '@/configs/sales/documents/payment-received';
import '@/configs/sales/documents/sales-invoice';
import '@/configs/sales/registers/accounts-receivable';

import { requireTenantContext } from '@/platform/auth/current-context';
import { withTenant } from '@/platform/db/tenant-context';
import { turnover } from '@/platform/engine';
import type { TurnoverRow } from '@/platform/engine/register-query';
import { getRegistry } from '@/platform/metadata';
import type { AccumulationRegisterConfig } from '@/platform/metadata';
import ExcelJS from 'exceljs';
import { z } from 'zod';

export const dynamic = 'force-dynamic';

// ─── Zod schema for query params ─────────────────────────────────────────────

function startOfMonthUtc(now: Date): Date {
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1));
}

const querySchema = z.object({
  from: z
    .string()
    .optional()
    .transform((v) => (v ? new Date(`${v}T00:00:00Z`) : startOfMonthUtc(new Date()))),
  to: z
    .string()
    .optional()
    .transform((v) => (v ? new Date(`${v}T23:59:59.999Z`) : new Date())),
  groupBy: z
    .union([z.string(), z.array(z.string())])
    .optional()
    .transform((v) => {
      if (!v) return undefined;
      return Array.isArray(v) ? v : [v];
    }),
});

// ─── Route handler ────────────────────────────────────────────────────────────

export async function GET(
  req: Request,
  ctx: { params: Promise<{ register: string }> },
): Promise<Response> {
  const { register: registerSlug } = await ctx.params;

  // Auth gate — requireTenantContext throws if unauthenticated / no tenant.
  const tenantCtx = await requireTenantContext();

  // Config lookup
  const config = getRegistry().register[registerSlug] as AccumulationRegisterConfig | undefined;
  if (!config) {
    return new Response(JSON.stringify({ error: 'register_not_found' }), {
      status: 404,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  // Parse query params
  const { searchParams } = new URL(req.url);
  const rawGroupBy = searchParams.getAll('groupBy');
  const parsed = querySchema.parse({
    from: searchParams.get('from') ?? undefined,
    to: searchParams.get('to') ?? undefined,
    groupBy: rawGroupBy.length > 0 ? rawGroupBy : undefined,
  });

  const fromDate = parsed.from;
  const toDate = parsed.to;
  const allDimKeys = Object.keys(config.dimensions);
  const groupBy: string[] = parsed.groupBy ?? allDimKeys;

  // Query turnover data
  const rows: TurnoverRow[] = await withTenant(tenantCtx.tenant.id, (tx) =>
    turnover(tx, config, {}, { from: fromDate, to: toDate, groupBy }),
  );

  // Resolve dimension display labels (same pattern as csv route)
  const dimDisplayValues = new Map<string, Map<string, string>>();

  for (const dimKey of groupBy) {
    const dimField = config.dimensions[dimKey];
    if (!dimField || dimField.type !== 'reference') continue;
    const ref = dimField.to;
    const refConfig = getRegistry().catalog[`${ref.module}.${ref.name}`];
    if (!refConfig) continue;

    const rawIds = rows.map((r) => r[dimKey]);
    const ids = Array.from(
      new Set(rawIds.filter((v): v is string => typeof v === 'string' && v.length > 0)),
    );
    if (ids.length === 0) continue;

    const displayField = refConfig.displayField ?? Object.keys(refConfig.fields)[0];
    if (!displayField) continue;

    const related = await withTenant(tenantCtx.tenant.id, async (tx) => {
      const snake = `catalog_${refConfig.module}_${refConfig.name}`;
      const bag = tx as unknown as Record<
        string,
        { findMany: (args: unknown) => Promise<Array<Record<string, unknown>>> } | undefined
      >;
      const delegate = bag[snake];
      if (!delegate) return [] as Array<Record<string, unknown>>;
      return delegate.findMany({
        where: { id: { in: ids } },
        select: { id: true, [displayField]: true },
      });
    });

    const byId = new Map(related.map((r) => [r.id as string, String(r[displayField] ?? '')]));
    dimDisplayValues.set(dimKey, byId);
  }

  // Build header column labels (English — safe for xlsx file headers)
  const headerCols: string[] = groupBy.map((key) => {
    const dimCfg = config.dimensions[key];
    return dimCfg?.label.en ?? key;
  });

  const numericHeaders = ['opening', 'income', 'expense', 'closing'];

  // ─── Build xlsx workbook ──────────────────────────────────────────────────

  const workbook = new ExcelJS.Workbook();
  const sheet = workbook.addWorksheet('Turnover');

  // Header row
  sheet.addRow([...headerCols, ...numericHeaders]);
  sheet.getRow(1).font = { bold: true };

  // Data rows
  for (const row of rows) {
    const dimValues: string[] = groupBy.map((key) => {
      const v = row[key];
      if (typeof v === 'string') {
        const byId = dimDisplayValues.get(key);
        return byId?.get(v) ?? v;
      }
      return v === null || v === undefined ? '' : String(v);
    });

    sheet.addRow([
      ...dimValues,
      Number(row.opening.toFixed(2)),
      Number(row.income.toFixed(2)),
      Number(row.expense.toFixed(2)),
      Number(row.closing.toFixed(2)),
    ]);
  }

  // Apply number format to money columns (dim cols + 4 numeric cols)
  const dimCount = groupBy.length;
  for (let i = 1; i <= 4; i++) {
    const colIdx = dimCount + i;
    sheet.getColumn(colIdx).numFmt = '#,##0.00';
  }

  const buffer = await workbook.xlsx.writeBuffer();

  const fromIso = fromDate.toISOString().slice(0, 10);
  const toIso = toDate.toISOString().slice(0, 10);
  const filename = `turnover-${registerSlug}-${fromIso}-${toIso}.xlsx`;

  return new Response(buffer as BodyInit, {
    status: 200,
    headers: {
      'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'Content-Disposition': `attachment; filename="${filename}"`,
    },
  });
}
