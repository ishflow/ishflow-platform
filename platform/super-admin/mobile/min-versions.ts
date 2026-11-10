/**
 * Min mobile app version flags. Stored in `PlatformSetting`. Read by the
 * mobile API on every request to decide whether the client must
 * "force-update" before continuing.
 */
import { withBypass } from '@/platform/db/tenant-context';
import { Prisma } from '@prisma/client';

const MIN_IOS_KEY = 'mobile.min_version_ios';
const MIN_ANDROID_KEY = 'mobile.min_version_android';

export interface MinVersionState {
  ios: string | null;
  android: string | null;
}

function parseVersion(input: unknown): string | null {
  if (typeof input === 'string') {
    const trimmed = input.trim();
    return trimmed.length > 0 ? trimmed : null;
  }
  if (input && typeof input === 'object' && 'version' in input) {
    return parseVersion((input as { version: unknown }).version);
  }
  return null;
}

export async function getMinAppVersions(): Promise<MinVersionState> {
  try {
    const rows = await withBypass((tx) =>
      tx.platformSetting.findMany({
        where: { key: { in: [MIN_IOS_KEY, MIN_ANDROID_KEY] } },
      }),
    );
    const byKey = new Map(rows.map((r) => [r.key, r.value as unknown]));
    return {
      ios: parseVersion(byKey.get(MIN_IOS_KEY)),
      android: parseVersion(byKey.get(MIN_ANDROID_KEY)),
    };
  } catch {
    return { ios: null, android: null };
  }
}

export async function setMinAppVersion(
  platform: 'ios' | 'android',
  version: string | null,
  updatedBy: string | null,
): Promise<void> {
  const key = platform === 'ios' ? MIN_IOS_KEY : MIN_ANDROID_KEY;
  const trimmed = version && version.trim().length > 0 ? version.trim() : null;
  const value = trimmed ?? Prisma.JsonNull;
  await withBypass((tx) =>
    tx.platformSetting.upsert({
      where: { key },
      create: { key, value, updatedBy: updatedBy ?? undefined },
      update: { value, updatedBy: updatedBy ?? undefined },
    }),
  );
}

export const MIN_VERSION_SETTING_KEYS = {
  IOS: MIN_IOS_KEY,
  ANDROID: MIN_ANDROID_KEY,
} as const;
