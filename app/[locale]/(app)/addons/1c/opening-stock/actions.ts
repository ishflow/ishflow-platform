'use server';

import {
  type OpeningStockInput,
  type OpeningStockResult,
  importOpeningStock,
  mapOpeningStockRows,
} from '@/platform/addons/1c-import/opening-stock';
import { requireTenantContext } from '@/platform/auth/current-context';
import { hasPermission } from '@/platform/engine/permissions';
import { parseUpload } from '@/platform/import';

const MAX_FILE_BYTES = 10 * 1024 * 1024; // 10 MB

function assertPermission(ctx: Awaited<ReturnType<typeof requireTenantContext>>): void {
  if (!hasPermission(ctx.permissions, 'admin.organization:edit')) {
    throw new Error('permission denied: admin.organization:edit required');
  }
}

export async function parseOpeningStockAction(file: File): Promise<{
  rows: OpeningStockInput[];
  errors: { row: number; message: string }[];
  total: number;
}> {
  const ctx = await requireTenantContext();
  assertPermission(ctx);
  if (file.size > MAX_FILE_BYTES) {
    throw new Error(`file too big: ${file.size} > 10 MB`);
  }
  const buf = Buffer.from(await file.arrayBuffer());
  const parsed = await parseUpload(buf, file.name);
  const mapped = mapOpeningStockRows(parsed);
  const parseErrors = parsed.errors.map((e) => ({ row: 0, message: e.message }));
  return {
    rows: mapped.rows,
    errors: [...parseErrors, ...mapped.errors],
    total: parsed.rows.length,
  };
}

export async function runOpeningStockAction(input: {
  warehouseId: string;
  rows: OpeningStockInput[];
}): Promise<OpeningStockResult> {
  const ctx = await requireTenantContext();
  assertPermission(ctx);
  return importOpeningStock(ctx, input);
}
