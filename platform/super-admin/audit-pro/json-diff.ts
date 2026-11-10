/**
 * Recursive JSON diff for the audit pro detail view.
 *
 * Produces a flat list of `(path, kind, before, after)` entries we can
 * render side-by-side. Object keys are walked recursively; arrays are
 * compared by index. Primitive equality is `Object.is` so `NaN` / `-0`
 * edge cases don't show as false positives.
 *
 * Pure / side-effect-free so it can be unit tested in isolation.
 */

export type DiffKind = 'added' | 'removed' | 'changed' | 'unchanged';

export interface DiffEntry {
  path: string;
  kind: DiffKind;
  before: unknown;
  after: unknown;
}

function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function isArray(value: unknown): value is unknown[] {
  return Array.isArray(value);
}

function joinPath(prefix: string, key: string | number): string {
  if (typeof key === 'number') {
    return `${prefix}[${key}]`;
  }
  return prefix === '' ? key : `${prefix}.${key}`;
}

function diffPrimitive(path: string, before: unknown, after: unknown, out: DiffEntry[]) {
  if (Object.is(before, after)) {
    out.push({ path, kind: 'unchanged', before, after });
    return;
  }
  if (before === undefined) {
    out.push({ path, kind: 'added', before: undefined, after });
    return;
  }
  if (after === undefined) {
    out.push({ path, kind: 'removed', before, after: undefined });
    return;
  }
  out.push({ path, kind: 'changed', before, after });
}

function walk(path: string, before: unknown, after: unknown, out: DiffEntry[]): void {
  if (Object.is(before, after)) {
    out.push({ path, kind: 'unchanged', before, after });
    return;
  }

  // Both objects → walk keys.
  if (isObject(before) && isObject(after)) {
    const keys = new Set<string>([...Object.keys(before), ...Object.keys(after)]);
    const sorted = Array.from(keys).sort();
    for (const k of sorted) {
      walk(joinPath(path, k), before[k], after[k], out);
    }
    return;
  }

  // Both arrays → compare by index.
  if (isArray(before) && isArray(after)) {
    const len = Math.max(before.length, after.length);
    for (let i = 0; i < len; i += 1) {
      walk(joinPath(path, i), before[i], after[i], out);
    }
    return;
  }

  // Otherwise it's a primitive (or shape-mismatch) — treat as scalar diff.
  diffPrimitive(path, before, after, out);
}

/** Compute a diff between two arbitrary JSON values. Root path is `''`. */
export function jsonDiff(before: unknown, after: unknown): DiffEntry[] {
  const entries: DiffEntry[] = [];
  walk('', before, after, entries);
  return entries;
}

/** True when the diff contains nothing but `unchanged` rows. */
export function hasChanges(entries: DiffEntry[]): boolean {
  return entries.some((e) => e.kind !== 'unchanged');
}
