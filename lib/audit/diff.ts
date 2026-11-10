export type DiffRow = { field: string; before: unknown; after: unknown };

/**
 * Shallow diff between two records. Returns only changed keys, with
 * undefined for sides that don't have the key (create vs. delete).
 * JSON.stringify is used for value comparison — good enough for scalars
 * and small objects; arrays/objects compare structurally.
 */
export function shallowDiff(
  before: Record<string, unknown> | null,
  after: Record<string, unknown> | null,
): DiffRow[] {
  const keys = new Set<string>([...Object.keys(before ?? {}), ...Object.keys(after ?? {})]);
  const rows: DiffRow[] = [];
  for (const k of keys) {
    const b = before?.[k];
    const a = after?.[k];
    if (JSON.stringify(b) !== JSON.stringify(a)) rows.push({ field: k, before: b, after: a });
  }
  rows.sort((x, y) => x.field.localeCompare(y.field));
  return rows;
}
