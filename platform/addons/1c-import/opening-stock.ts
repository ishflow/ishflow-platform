import type { AppContext } from '@/platform/auth/current-context';
import { createDocument, deleteDocument, listRecords, postDocument } from '@/platform/engine';
import type { ImportRowError } from '@/platform/import';
import { getRegistry } from '@/platform/metadata';
import { z } from 'zod';

export type OpeningStockInput = { product: string; quantity: number; unitCost: number };

export type OpeningStockResult = {
  posted: number;
  skipped: number;
  errors: ImportRowError[];
  documentId: string | null;
};

// Column-header synonyms (normalized: lowercased, punctuation stripped).
const PRODUCT_COLS = [
  'номенклатура',
  'товар',
  'продукт',
  'наименование',
  'product',
  'ürün',
  'name',
];
const QTY_COLS = ['количество', 'колво', 'остаток', 'quantity', 'qty', 'miktar', 'stok'];
const COST_COLS = ['себестоимость', 'стоимость', 'цена', 'unitcost', 'cost', 'price', 'maliyet'];

function norm(s: string): string {
  return s
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9а-яё]/gi, '');
}

/**
 * Normalize a numeric cell from a localized export: strip whitespace (RU
 * thousands separator) and turn a trailing decimal comma into a dot ("5,50" →
 * "5.50"). An empty cell becomes `undefined` so it fails as a clear error
 * rather than silently coercing to 0.
 */
function cleanNumeric(v: unknown): unknown {
  if (typeof v !== 'string') return v;
  const cleaned = v.replace(/\s/g, '').replace(/,(\d+)$/, '.$1');
  return cleaned === '' ? undefined : cleaned;
}

const rowSchema = z.object({
  product: z.string().trim().min(1),
  // quantityDelta is an integer column; reject fractional quantities cleanly.
  quantity: z.preprocess(cleanNumeric, z.coerce.number().int().positive()),
  unitCost: z.preprocess(cleanNumeric, z.coerce.number().min(0)),
});

function findColumn(headers: string[], syns: string[]): string | undefined {
  for (const h of headers) {
    if (syns.includes(norm(h))) return h;
  }
  return undefined;
}

/**
 * Map a parsed CSV/XLSX (headers + string rows) to typed opening-stock rows.
 * Pure: detects product/quantity/unit-cost columns by RU+EN+TR synonyms and
 * validates each row; malformed rows go to `errors` rather than throwing.
 */
export function mapOpeningStockRows(parsed: {
  headers: string[];
  rows: Record<string, string>[];
}): { rows: OpeningStockInput[]; errors: ImportRowError[] } {
  const productCol = findColumn(parsed.headers, PRODUCT_COLS);
  const qtyCol = findColumn(parsed.headers, QTY_COLS);
  const costCol = findColumn(parsed.headers, COST_COLS);

  const rows: OpeningStockInput[] = [];
  const errors: ImportRowError[] = [];

  if (!productCol || !qtyCol || !costCol) {
    const missing = [
      productCol ? null : 'product',
      qtyCol ? null : 'quantity',
      costCol ? null : 'unitCost',
    ].filter(Boolean);
    errors.push({ row: 0, message: `columns not found: ${missing.join(', ')}` });
    return { rows, errors };
  }

  for (const [i, raw] of parsed.rows.entries()) {
    const parsedRow = rowSchema.safeParse({
      product: raw[productCol],
      quantity: raw[qtyCol],
      unitCost: raw[costCol],
    });
    if (!parsedRow.success) {
      const message = parsedRow.error.issues
        .map((iss) => `${iss.path.join('.') || 'row'}: ${iss.message}`)
        .join('; ');
      errors.push({ row: i + 1, message });
      continue;
    }
    rows.push(parsedRow.data);
  }
  return { rows, errors };
}

/**
 * Resolve each row's product reference (1C externalId/GUID first, then exact
 * name) to an internal id, then create ONE `inventory.stock_adjustment`
 * document for the warehouse and post it — positive quantityDelta + unitCost
 * records cost-bearing opening stock in the stock-balance register.
 */
export async function importOpeningStock(
  ctx: AppContext,
  input: { warehouseId: string; rows: OpeningStockInput[] },
): Promise<OpeningStockResult> {
  const productConfig = getRegistry().catalog['inventory.product'];
  if (!productConfig) {
    throw new Error('importOpeningStock: inventory.product catalog not registered');
  }
  const warehouseConfig = getRegistry().catalog['inventory.warehouse'];
  if (!warehouseConfig) {
    throw new Error('importOpeningStock: inventory.warehouse catalog not registered');
  }
  const docConfig = getRegistry().document['inventory.stock_adjustment'];
  if (!docConfig) {
    throw new Error('importOpeningStock: inventory.stock_adjustment not registered');
  }

  // Document reference fields have no DB foreign key, so a forged/stale
  // warehouse id would post phantom stock — validate it against the tenant.
  const warehouses = await listRecords(ctx, warehouseConfig);
  const warehouseOk = warehouses.some(
    (w) => String((w as { id?: unknown }).id) === input.warehouseId,
  );
  if (!warehouseOk) {
    throw new Error(`warehouse not found: ${input.warehouseId}`);
  }

  // Build resolution maps. Name has no unique constraint, so track names that
  // map to more than one product and refuse to bind them (silent wrong pick).
  const existing = await listRecords(ctx, productConfig);
  const byExternalId = new Map<string, string>();
  const byName = new Map<string, string>();
  const ambiguousNames = new Set<string>();
  for (const r of existing) {
    const id = (r as { id?: unknown }).id;
    if (typeof id !== 'string') continue;
    const ext = (r as { externalId?: unknown }).externalId;
    if (typeof ext === 'string' && ext) byExternalId.set(ext, id);
    const name = (r as { name?: unknown }).name;
    if (typeof name === 'string' && name) {
      const key = norm(name);
      if (byName.has(key) && byName.get(key) !== id) ambiguousNames.add(key);
      else byName.set(key, id);
    }
  }

  const errors: ImportRowError[] = [];
  const lines: Array<{ product: string; quantityDelta: number; unitCost: number }> = [];
  for (const [i, row] of input.rows.entries()) {
    let id = byExternalId.get(row.product);
    if (!id) {
      const key = norm(row.product);
      if (ambiguousNames.has(key)) {
        errors.push({ row: i + 1, message: `ambiguous product name: ${row.product}` });
        continue;
      }
      id = byName.get(key);
    }
    if (!id) {
      errors.push({ row: i + 1, message: `product not found: ${row.product}` });
      continue;
    }
    lines.push({ product: id, quantityDelta: row.quantity, unitCost: row.unitCost });
  }

  if (lines.length === 0) {
    return { posted: 0, skipped: errors.length, errors, documentId: null };
  }

  const created = await createDocument(ctx, docConfig, {
    date: new Date(),
    warehouse: input.warehouseId,
    reason: 'Открытие остатков (1C)',
    lines: { items: lines },
  });
  const documentId = String((created as { id?: unknown }).id);
  try {
    await postDocument(ctx, docConfig, documentId);
  } catch (err) {
    // createDocument + postDocument are separate transactions. If posting
    // fails (plan limit, closed period, validator), delete the orphaned SAVED
    // document so a retry doesn't double-count, then surface the error.
    try {
      await deleteDocument(ctx, docConfig, documentId);
    } catch {
      // best-effort cleanup; surface the original posting error below
    }
    throw err;
  }

  return { posted: lines.length, skipped: errors.length, errors, documentId };
}
