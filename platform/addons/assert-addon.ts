import type { AppContext } from '@/platform/auth/current-context';
import type { AddonKey } from './catalog';
import { hasAddon } from './has-addon';

/**
 * Thrown when a guarded code path runs without the matching addon enabled
 * for the current tenant. Route handlers should convert this into a
 * `feature_locked`/`addon_disabled` JSON 402 response; UI surfaces should
 * never call into the guarded path when `hasAddon` is false.
 */
export class AddonDisabledError extends Error {
  constructor(public readonly key: AddonKey) {
    super(`addon_disabled:${key}`);
    this.name = 'AddonDisabledError';
  }
  toJSON() {
    return { error: 'addon_disabled' as const, addon: this.key };
  }
}

export function assertAddonEnabled(ctx: AppContext, key: AddonKey): void {
  if (!hasAddon(ctx, key)) {
    throw new AddonDisabledError(key);
  }
}
