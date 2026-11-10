import type { AppContext } from '@/platform/auth/current-context';
import { createRecord, listRecords } from '@/platform/engine';
import { getRegistry } from '@/platform/metadata';
import type { CatalogConfig } from '@/platform/metadata';
import { MAX_ROWS } from './parse';
import { type ImportEntity, getSchema } from './validators';

export type ImportRowError = { row: number; message: string };

export type ImportResult = {
  inserted: number;
  skipped: number;
  errors: ImportRowError[];
};

const CATALOG_ID_FOR: Record<ImportEntity, string> = {
  customer: 'sales.customer',
  product: 'inventory.product',
  supplier: 'purchases.supplier',
};

function catalogFor(entity: ImportEntity): CatalogConfig {
  const id = CATALOG_ID_FOR[entity];
  const cfg = getRegistry().catalog[id];
  if (!cfg) throw new Error(`runImport: catalog "${id}" not registered`);
  return cfg;
}

export async function runImport(
  ctx: AppContext,
  entity: ImportEntity,
  rows: Record<string, unknown>[],
): Promise<ImportResult> {
  if (rows.length === 0) throw new Error('runImport: no rows to import');
  if (rows.length > MAX_ROWS) {
    throw new Error(`runImport: too many rows (${rows.length} > ${MAX_ROWS})`);
  }

  const schema = getSchema(entity);
  const config = catalogFor(entity);

  const result: ImportResult = { inserted: 0, skipped: 0, errors: [] };

  // Phase 1: validate every row up-front. If ANY row fails Zod validation,
  // we report all errors and refuse to insert anything (no partial writes
  // when the input file is malformed). DB errors during Phase 2 are
  // captured per-row so we don't abort the rest of a valid batch.
  const validated: Array<{ row: number; data: Record<string, unknown> }> = [];
  for (let i = 0; i < rows.length; i++) {
    const rowNumber = i + 1;
    const parsed = schema.safeParse(rows[i]);
    if (!parsed.success) {
      const message = parsed.error.issues
        .map((issue) => `${issue.path.join('.') || 'row'}: ${issue.message}`)
        .join('; ');
      result.errors.push({ row: rowNumber, message });
      continue;
    }
    validated.push({ row: rowNumber, data: parsed.data as Record<string, unknown> });
  }

  if (result.errors.length > 0) {
    return result;
  }

  // Pre-load existing externalIds (if the entity supports it) so we can skip
  // duplicates within the SAME tenant on re-import.
  const existing = await listRecords(ctx, config);
  const existingExternalIds = new Set(
    existing
      .map((r) => (r as { externalId?: unknown }).externalId)
      .filter((v): v is string => typeof v === 'string'),
  );

  for (const { row, data } of validated) {
    const externalId = data.externalId;
    if (typeof externalId === 'string' && existingExternalIds.has(externalId)) {
      result.skipped += 1;
      continue;
    }
    try {
      await createRecord(ctx, config, data);
      if (typeof externalId === 'string') existingExternalIds.add(externalId);
      result.inserted += 1;
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      result.errors.push({ row, message });
    }
  }

  return result;
}
