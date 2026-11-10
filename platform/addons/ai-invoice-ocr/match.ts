import type { Prisma } from '@prisma/client';

type Tx = Prisma.TransactionClient;

/**
 * Normalize a free-form catalog name: lowercase + trim + collapse
 * whitespace. Used for case-insensitive equality lookups against the
 * Russian/English/Turkish names typed into the catalog.
 */
export function normalizeName(input: string): string {
  return input.trim().toLowerCase().replace(/\s+/g, ' ');
}

/**
 * Tokenize a name into lower-cased word tokens. Punctuation is dropped;
 * 1-char tokens are dropped (Russian conjunctions, OCR fragments).
 */
export function tokenize(input: string): string[] {
  return normalizeName(input)
    .split(/[^a-zа-яё0-9]+/i)
    .filter((t) => t.length > 1);
}

/**
 * Compute the token-overlap ratio between two product descriptions:
 * |A ∩ B| / max(|A|, |B|). Both sides are tokenized first.
 *
 * Returns 0 when either side has no tokens (treat as no overlap rather
 * than 1.0 — we never want to "match" an empty string to anything).
 */
export function tokenOverlap(a: string, b: string): number {
  const A = new Set(tokenize(a));
  const B = new Set(tokenize(b));
  if (A.size === 0 || B.size === 0) return 0;
  let shared = 0;
  for (const t of A) if (B.has(t)) shared += 1;
  return shared / Math.max(A.size, B.size);
}

export type SupplierCandidate = { id: string; name: string };
export type ProductCandidate = { id: string; name: string; code: string };

/**
 * Supplier matching: case-insensitive name equality. The `supplierInn`
 * field is plumbed through the OCR schema for future use, but the current
 * `catalog_purchases_supplier` table has no INN column — once a `taxNumber`
 * field lands on the supplier catalog, this fn should be upgraded to:
 *   1. exact INN
 *   2. exact name (current behaviour)
 *   3. null
 *
 * Returns the first matching supplier or null.
 */
export function matchSupplierFromCandidates(
  parsed: { supplierName: string | null; supplierInn: string | null },
  candidates: SupplierCandidate[],
): SupplierCandidate | null {
  if (!parsed.supplierName) return null;
  const target = normalizeName(parsed.supplierName);
  if (target.length === 0) return null;
  for (const c of candidates) {
    if (normalizeName(c.name) === target) return c;
  }
  return null;
}

/**
 * Product matching for one OCR line. Strategy:
 *   1. Case-insensitive name equality on the line description.
 *   2. Token-overlap ≥ 60% (returns the highest-scoring candidate; ties
 *      go to the first encountered).
 *   3. null.
 */
export function matchProductFromCandidates(
  description: string,
  candidates: ProductCandidate[],
): ProductCandidate | null {
  if (!description) return null;
  const target = normalizeName(description);
  if (target.length === 0) return null;

  // 1. Exact equality.
  for (const c of candidates) {
    if (normalizeName(c.name) === target) return c;
  }

  // 2. Token overlap.
  let best: { row: ProductCandidate; score: number } | null = null;
  for (const c of candidates) {
    const score = tokenOverlap(description, c.name);
    if (score < 0.6) continue;
    if (!best || score > best.score) {
      best = { row: c, score };
    }
  }
  return best?.row ?? null;
}

/**
 * DB-backed supplier match. Fetches every supplier for the tenant
 * (cheap — SMBs rarely cross 1000 rows; the dialog is interactive so a
 * single lookup-per-job is fine) and runs in-memory.
 */
export async function matchSupplier(
  tx: Tx,
  parsed: { supplierName: string | null; supplierInn: string | null },
): Promise<SupplierCandidate | null> {
  if (!parsed.supplierName) return null;
  // biome-ignore lint/suspicious/noExplicitAny: prisma delegate access via dynamic key
  const rows = (await (tx as any).catalog_purchases_supplier.findMany({
    where: { deletedAt: null },
    select: { id: true, name: true },
  })) as SupplierCandidate[];
  return matchSupplierFromCandidates(parsed, rows);
}

/**
 * DB-backed product matches for every OCR line. Single query for all
 * products, then in-memory match per line.
 */
export async function matchProductsForLines(
  tx: Tx,
  lines: Array<{ description: string }>,
): Promise<Array<ProductCandidate | null>> {
  // biome-ignore lint/suspicious/noExplicitAny: prisma delegate access via dynamic key
  const rows = (await (tx as any).catalog_inventory_product.findMany({
    where: { deletedAt: null },
    select: { id: true, name: true, code: true },
  })) as ProductCandidate[];
  return lines.map((l) => matchProductFromCandidates(l.description, rows));
}
