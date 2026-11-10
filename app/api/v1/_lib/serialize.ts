/**
 * Row serializer for `/api/v1` responses.
 *
 * Translates a Prisma row into the shape external consumers see:
 *   - snake_case keys → camelCase
 *   - Date values → ISO 8601 strings
 *   - tenant-identifying and soft-delete columns dropped by default
 *
 * Single-level only. Nested objects/arrays are returned as-is; callers must
 * recurse themselves when the shape demands it. Keeping this flat avoids
 * accidental over-eager transformation of relation payloads.
 */

const DEFAULT_OMIT: ReadonlyArray<string> = Object.freeze([
  'tenantId',
  'tenant_id',
  'deletedAt',
  'deleted_at',
]);

const SNAKE_CASE_RE = /^[a-z0-9]+(_[a-z0-9]+)+$/;

function snakeToCamel(key: string): string {
  return key.replace(/_([a-z0-9])/g, (_, c: string) => c.toUpperCase());
}

/**
 * Remap a single row. `null` and `undefined` values are preserved so consumers
 * can distinguish "missing" from "absent". The spec does not require stripping
 * empty fields, and dropping them silently has historically caused mobile
 * clients to mis-render optional columns.
 */
export function serializeRow<T extends Record<string, unknown>>(
  row: T,
  omit: ReadonlyArray<string> = [],
): Record<string, unknown> {
  const skip = new Set<string>([...DEFAULT_OMIT, ...omit]);
  const out: Record<string, unknown> = {};

  for (const [key, value] of Object.entries(row)) {
    if (skip.has(key)) continue;

    const outKey = SNAKE_CASE_RE.test(key) ? snakeToCamel(key) : key;
    out[outKey] = value instanceof Date ? value.toISOString() : value;
  }

  return out;
}
