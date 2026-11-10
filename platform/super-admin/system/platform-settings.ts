/**
 * Generic helpers for the `PlatformSetting` key/value store. All access goes
 * through `withBypass` because `PlatformSetting` is a global (non-tenant) table
 * and writes are only ever performed by the super-admin operator.
 *
 * The shape of `value` is `Json`. Callers should treat `unknown` and parse
 * defensively. Higher-level wrappers (maintenance / read-only / mobile
 * versions) live next to this file and own the parse rules.
 */
import { withBypass } from '@/platform/db/tenant-context';
import type { Prisma } from '@prisma/client';

export interface PlatformSettingRow {
  key: string;
  value: unknown;
  updatedAt: Date;
  updatedBy: string | null;
}

export async function listPlatformSettings(): Promise<PlatformSettingRow[]> {
  return withBypass(async (tx) => {
    const rows = await tx.platformSetting.findMany({
      orderBy: { key: 'asc' },
    });
    return rows.map((r) => ({
      key: r.key,
      value: r.value as unknown,
      updatedAt: r.updatedAt,
      updatedBy: r.updatedBy,
    }));
  });
}

export async function getPlatformSetting(key: string): Promise<PlatformSettingRow | null> {
  const row = await withBypass((tx) => tx.platformSetting.findUnique({ where: { key } }));
  if (!row) return null;
  return {
    key: row.key,
    value: row.value as unknown,
    updatedAt: row.updatedAt,
    updatedBy: row.updatedBy,
  };
}

export async function setPlatformSetting(
  key: string,
  value: Prisma.InputJsonValue,
  updatedBy: string | null,
): Promise<void> {
  await withBypass((tx) =>
    tx.platformSetting.upsert({
      where: { key },
      create: { key, value, updatedBy: updatedBy ?? undefined },
      update: { value, updatedBy: updatedBy ?? undefined },
    }),
  );
}

export async function deletePlatformSetting(key: string): Promise<void> {
  await withBypass((tx) => tx.platformSetting.deleteMany({ where: { key } }));
}

/**
 * Parse arbitrary JSON text into a value safe for `Prisma.InputJsonValue`.
 * Rejects `undefined` and `NaN`. Returns the parsed value on success or an
 * error message on failure (so callers can surface a friendly error).
 */
export function parseJsonValue(
  raw: string,
): { ok: true; value: Prisma.InputJsonValue } | { ok: false; error: string } {
  const trimmed = raw.trim();
  if (trimmed === '') return { ok: false, error: 'value is empty' };
  try {
    const parsed = JSON.parse(trimmed) as unknown;
    if (parsed === undefined) return { ok: false, error: 'value cannot be undefined' };
    // Number sanity — JSON.parse never returns NaN/Infinity but guard anyway.
    if (typeof parsed === 'number' && !Number.isFinite(parsed)) {
      return { ok: false, error: 'value is not a finite number' };
    }
    return { ok: true, value: parsed as Prisma.InputJsonValue };
  } catch (e) {
    return { ok: false, error: `invalid JSON: ${(e as Error).message}` };
  }
}
