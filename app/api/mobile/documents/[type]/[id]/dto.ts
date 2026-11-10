/**
 * Pure projection helpers for `GET /api/mobile/documents/[type]/[id]`.
 *
 * Kept side-effect free + DB free so they can be unit-tested directly.
 * The route layer is responsible for resolving counterparties (which needs
 * the request's tenant context) and merging that result on top of `project`.
 */

export type RawDoc = Record<string, unknown> & {
  lines?: Record<string, unknown[]>;
};

type LineRow = Record<string, unknown> & {
  id: unknown;
  product?: unknown;
  quantity?: unknown;
  price?: unknown;
};

export type DocumentLineDto = {
  id: string;
  productId: string;
  quantity: string;
  price: string;
  total: string;
};

/**
 * Project the raw engine row into the DTO carried over the wire:
 *   - all original header columns are preserved (so additive optional fields
 *     remain backwards-compatible with existing iOS/Android clients)
 *   - `items` flat line array (the `items` section, if present)
 *   - `total` as a 2-decimal string (Σ line.qty*price OR doc.amount)
 */
export function projectDocument(doc: RawDoc): Record<string, unknown> {
  const items = projectItemsSection(doc);
  const total = computeTotal(doc, items);
  return {
    ...doc,
    ...(items ? { items } : {}),
    ...(total != null ? { total } : {}),
  };
}

export function projectItemsSection(doc: RawDoc): DocumentLineDto[] | undefined {
  const rawItems = doc.lines?.items;
  if (!Array.isArray(rawItems) || rawItems.length === 0) return undefined;
  return rawItems.map((row) => projectLine(row as LineRow));
}

function projectLine(row: LineRow): DocumentLineDto {
  const quantity = toNumber(row.quantity);
  const price = toNumber(row.price);
  const lineTotal = quantity != null && price != null ? (quantity * price).toFixed(2) : '0';
  return {
    id: String(row.id),
    productId: row.product != null ? String(row.product) : '',
    quantity: row.quantity != null ? String(row.quantity) : '0',
    price: row.price != null ? String(row.price) : '0',
    total: lineTotal,
  };
}

export function computeTotal(
  doc: RawDoc,
  items: DocumentLineDto[] | undefined,
): string | undefined {
  if (items && items.length > 0) {
    let sum = 0;
    for (const line of items) {
      const t = Number(line.total ?? 0);
      if (Number.isFinite(t)) sum += t;
    }
    return sum.toFixed(2);
  }
  const amount = toNumber(doc.amount);
  return amount != null ? amount.toFixed(2) : undefined;
}

function toNumber(value: unknown): number | undefined {
  if (value == null) return undefined;
  if (typeof value === 'number') return Number.isFinite(value) ? value : undefined;
  if (typeof value === 'string') {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : undefined;
  }
  if (
    typeof value === 'object' &&
    typeof (value as { toString?: () => string }).toString === 'function'
  ) {
    const parsed = Number((value as { toString: () => string }).toString());
    return Number.isFinite(parsed) ? parsed : undefined;
  }
  return undefined;
}
