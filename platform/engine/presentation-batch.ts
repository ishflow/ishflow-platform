import type { AppContext } from '@/platform/auth/current-context';
import { type PresentationByRefOptions, getPresentationsByRefs } from './presentation';

export type PresentationRef = {
  typeId: string;
  id: string;
};

/**
 * Build the cross-type lookup key stored in the map returned by
 * `getPresentationsForRefs`.
 */
export function presentationKey(typeId: string, id: string): string {
  return `${typeId}:${id}`;
}

/**
 * Cross-type batch variant of `getPresentationsByRefs`. Takes a heterogeneous
 * list of `{ typeId, id }` refs, groups them by typeId, issues one
 * `getPresentationsByRefs` call per group, and returns a combined map keyed by
 * `` `${typeId}:${id}` ``.
 *
 * Behavior mirrors `getPresentationsByRefs`:
 *  - Unknown typeId → every id in that group falls back to its short 8-char uuid.
 *  - Missing row → short 8-char uuid fallback.
 *  - Empty / non-string ids are silently dropped.
 *  - Duplicate `(typeId, id)` pairs are deduplicated.
 *
 * When `opts.tx` is supplied, every per-typeId lookup reuses the caller's
 * transaction; otherwise each group opens its own `withTenant` scope inside
 * `getPresentationsByRefs`.
 */
export async function getPresentationsForRefs(
  ctx: AppContext,
  refs: readonly PresentationRef[],
  opts?: PresentationByRefOptions,
): Promise<Map<string, string>> {
  const result = new Map<string, string>();
  if (refs.length === 0) return result;

  const byType = new Map<string, Set<string>>();
  for (const ref of refs) {
    if (typeof ref.id !== 'string' || ref.id.length === 0) continue;
    if (typeof ref.typeId !== 'string' || ref.typeId.length === 0) continue;
    let bucket = byType.get(ref.typeId);
    if (!bucket) {
      bucket = new Set<string>();
      byType.set(ref.typeId, bucket);
    }
    bucket.add(ref.id);
  }
  if (byType.size === 0) return result;

  await Promise.all(
    Array.from(byType.entries()).map(async ([typeId, idSet]) => {
      const ids = Array.from(idSet);
      const labels = await getPresentationsByRefs(ctx, typeId, ids, opts);
      for (const [id, label] of labels) {
        result.set(presentationKey(typeId, id), label);
      }
    }),
  );

  return result;
}
