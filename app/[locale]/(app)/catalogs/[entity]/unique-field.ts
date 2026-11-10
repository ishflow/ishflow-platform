import type { CatalogConfig } from '@/platform/metadata';

/**
 * Extract the first config-relevant field name from a Prisma P2002 unique-constraint error.
 *
 * Lives outside `actions.ts` because `'use server'` modules are only allowed to export
 * async functions. Kept pure so it is unit-testable without hitting the server boundary.
 *
 * Without a config, returns the first entry from `meta.target` verbatim (legacy behavior).
 * With a config, scans `meta.target` and returns the first element that exists in
 * `config.fields` — necessary for composite uniques like `@@unique([tenantId, code])` where
 * `target[0]` is `"tenantId"` (a system column the user never submitted) and the real
 * collision is on `"code"`.
 */
export function extractPrismaUniqueField(error: unknown, config?: CatalogConfig): string | null {
  if (!error || typeof error !== 'object') return null;
  const maybe = error as { code?: string; meta?: { target?: string[] | string } };
  if (maybe.code !== 'P2002') return null;
  const target = maybe.meta?.target;
  const candidates = Array.isArray(target) ? target : typeof target === 'string' ? [target] : [];
  if (!config) return candidates[0] ?? null;
  for (const name of candidates) {
    if (config.fields[name]) return name;
  }
  return null;
}
