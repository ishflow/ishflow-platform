/**
 * Prisma returns `Decimal` objects for numeric columns; React Server Components
 * cannot serialize non-plain class instances across the RSC boundary. Convert
 * such values to primitives before handing rows to Client Components.
 */
export function toPlainRows<T extends Record<string, unknown>>(rows: T[]): T[] {
  return rows.map(toPlainRow);
}

function toPlainRow<T extends Record<string, unknown>>(row: T): T {
  const out: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(row)) {
    out[key] = toPlainValue(value);
  }
  return out as T;
}

function toPlainValue(value: unknown): unknown {
  if (value === null || value === undefined) return value;
  if (value instanceof Date) return value;
  if (Array.isArray(value)) return value.map(toPlainValue);
  if (typeof value === 'object') {
    const ctor = (value as { constructor?: { name?: string } }).constructor?.name;
    if (ctor === 'Decimal') return (value as { toString(): string }).toString();
    if (ctor === 'Object') {
      const out: Record<string, unknown> = {};
      for (const [k, v] of Object.entries(value as Record<string, unknown>)) {
        out[k] = toPlainValue(v);
      }
      return out;
    }
  }
  return value;
}
