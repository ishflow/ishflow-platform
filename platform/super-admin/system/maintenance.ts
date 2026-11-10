/**
 * Maintenance + Read-only mode flags. Both stored in `PlatformSetting`.
 *
 * - `maintenance.enabled` (boolean) — flips tenant-app middleware to redirect
 *   to `/maintenance`. `maintenance.until` (ISO timestamp) optionally drives a
 *   countdown displayed on the maintenance page.
 * - `readonly.enabled` (boolean) — write APIs / mutations short-circuit with
 *   HTTP 503.
 *
 * Cached in-process for 30 seconds. Middleware hits this on every request so
 * we trade a brief drift window for not slamming Postgres.
 */
import { withBypass } from '@/platform/db/tenant-context';
import { Prisma } from '@prisma/client';

const MAINTENANCE_ENABLED_KEY = 'maintenance.enabled';
const MAINTENANCE_UNTIL_KEY = 'maintenance.until';
const MAINTENANCE_MESSAGE_KEY = 'maintenance.message';
const READONLY_ENABLED_KEY = 'readonly.enabled';

const CACHE_TTL_MS = 30_000;

export interface MaintenanceState {
  enabled: boolean;
  /** ISO timestamp; null when no countdown configured. */
  until: string | null;
  /** Optional operator message shown on the maintenance page. */
  message: string | null;
}

interface CachedMaintenance {
  value: MaintenanceState;
  fetchedAt: number;
}

interface CachedReadonly {
  value: boolean;
  fetchedAt: number;
}

let maintenanceCache: CachedMaintenance | undefined;
let readonlyCache: CachedReadonly | undefined;

export function clearMaintenanceCaches(): void {
  maintenanceCache = undefined;
  readonlyCache = undefined;
}

function parseBoolean(input: unknown): boolean {
  if (typeof input === 'boolean') return input;
  if (typeof input === 'string') {
    const v = input.toLowerCase().trim();
    return v === 'true' || v === '1' || v === 'on' || v === 'yes';
  }
  if (input && typeof input === 'object') {
    if ('enabled' in input) {
      return parseBoolean((input as { enabled: unknown }).enabled);
    }
    if ('value' in input) {
      return parseBoolean((input as { value: unknown }).value);
    }
  }
  return false;
}

function parseIsoString(input: unknown): string | null {
  if (typeof input === 'string') {
    const d = new Date(input);
    if (!Number.isNaN(d.getTime())) return d.toISOString();
  }
  if (input && typeof input === 'object' && 'until' in input) {
    return parseIsoString((input as { until: unknown }).until);
  }
  return null;
}

function parseMessage(input: unknown): string | null {
  if (typeof input === 'string') {
    const trimmed = input.trim();
    return trimmed.length > 0 ? trimmed.slice(0, 500) : null;
  }
  if (input && typeof input === 'object' && 'message' in input) {
    return parseMessage((input as { message: unknown }).message);
  }
  return null;
}

export async function getMaintenanceState(): Promise<MaintenanceState> {
  if (maintenanceCache && Date.now() - maintenanceCache.fetchedAt < CACHE_TTL_MS) {
    return maintenanceCache.value;
  }
  try {
    const rows = await withBypass((tx) =>
      tx.platformSetting.findMany({
        where: {
          key: { in: [MAINTENANCE_ENABLED_KEY, MAINTENANCE_UNTIL_KEY, MAINTENANCE_MESSAGE_KEY] },
        },
      }),
    );
    const byKey = new Map(rows.map((r) => [r.key, r.value as unknown]));
    const value: MaintenanceState = {
      enabled: parseBoolean(byKey.get(MAINTENANCE_ENABLED_KEY)),
      until: parseIsoString(byKey.get(MAINTENANCE_UNTIL_KEY)),
      message: parseMessage(byKey.get(MAINTENANCE_MESSAGE_KEY)),
    };
    maintenanceCache = { value, fetchedAt: Date.now() };
    return value;
  } catch {
    return { enabled: false, until: null, message: null };
  }
}

export async function setMaintenanceState(
  next: { enabled: boolean; until?: string | null; message?: string | null },
  updatedBy: string | null,
): Promise<void> {
  const writes = [
    withBypass((tx) =>
      tx.platformSetting.upsert({
        where: { key: MAINTENANCE_ENABLED_KEY },
        create: {
          key: MAINTENANCE_ENABLED_KEY,
          value: next.enabled,
          updatedBy: updatedBy ?? undefined,
        },
        update: { value: next.enabled, updatedBy: updatedBy ?? undefined },
      }),
    ),
  ];
  if (next.until !== undefined) {
    const untilValue = next.until ?? Prisma.JsonNull;
    writes.push(
      withBypass((tx) =>
        tx.platformSetting.upsert({
          where: { key: MAINTENANCE_UNTIL_KEY },
          create: {
            key: MAINTENANCE_UNTIL_KEY,
            value: untilValue,
            updatedBy: updatedBy ?? undefined,
          },
          update: { value: untilValue, updatedBy: updatedBy ?? undefined },
        }),
      ),
    );
  }
  if (next.message !== undefined) {
    const messageValue = next.message ?? Prisma.JsonNull;
    writes.push(
      withBypass((tx) =>
        tx.platformSetting.upsert({
          where: { key: MAINTENANCE_MESSAGE_KEY },
          create: {
            key: MAINTENANCE_MESSAGE_KEY,
            value: messageValue,
            updatedBy: updatedBy ?? undefined,
          },
          update: { value: messageValue, updatedBy: updatedBy ?? undefined },
        }),
      ),
    );
  }
  await Promise.all(writes);
  clearMaintenanceCaches();
}

export async function getReadonlyEnabled(): Promise<boolean> {
  if (readonlyCache && Date.now() - readonlyCache.fetchedAt < CACHE_TTL_MS) {
    return readonlyCache.value;
  }
  try {
    const row = await withBypass((tx) =>
      tx.platformSetting.findUnique({ where: { key: READONLY_ENABLED_KEY } }),
    );
    const value = parseBoolean(row?.value);
    readonlyCache = { value, fetchedAt: Date.now() };
    return value;
  } catch {
    return false;
  }
}

export async function setReadonlyEnabled(
  enabled: boolean,
  updatedBy: string | null,
): Promise<void> {
  await withBypass((tx) =>
    tx.platformSetting.upsert({
      where: { key: READONLY_ENABLED_KEY },
      create: { key: READONLY_ENABLED_KEY, value: enabled, updatedBy: updatedBy ?? undefined },
      update: { value: enabled, updatedBy: updatedBy ?? undefined },
    }),
  );
  readonlyCache = undefined;
}

export const MAINTENANCE_SETTING_KEYS = {
  ENABLED: MAINTENANCE_ENABLED_KEY,
  UNTIL: MAINTENANCE_UNTIL_KEY,
  MESSAGE: MAINTENANCE_MESSAGE_KEY,
} as const;

export const READONLY_SETTING_KEY = READONLY_ENABLED_KEY;
