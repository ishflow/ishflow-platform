// Shared list pagination helpers — used by document/register list loaders so a
// tenant with thousands of records can page through all of them (not just the
// first 50) and the header count reflects the true total.

export const DEFAULT_PAGE_SIZE = 50;

/** Parse a 1-based page from a raw search param. Clamps to >= 1. */
export function parsePage(raw: string | string[] | undefined): number {
  const v = Array.isArray(raw) ? raw[0] : raw;
  const n = Number.parseInt(v ?? '1', 10);
  return Number.isFinite(n) && n >= 1 ? n : 1;
}

/** Total number of pages for `total` rows at `pageSize` (always >= 1). */
export function totalPages(total: number, pageSize: number = DEFAULT_PAGE_SIZE): number {
  if (pageSize <= 0) return 1;
  return Math.max(1, Math.ceil(total / pageSize));
}

/** Zero-based offset for `prisma.skip`, clamped so it never goes negative. */
export function pageOffset(page: number, pageSize: number = DEFAULT_PAGE_SIZE): number {
  return Math.max(0, (Math.max(1, page) - 1) * pageSize);
}

/** Inclusive 1-based row range shown on the current page, e.g. "51–100 of 1184". */
export function pageRange(
  page: number,
  pageSize: number,
  total: number,
): { from: number; to: number } {
  if (total === 0) return { from: 0, to: 0 };
  const from = (Math.max(1, page) - 1) * pageSize + 1;
  const to = Math.min(page * pageSize, total);
  return { from, to };
}
