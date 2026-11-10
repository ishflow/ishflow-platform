import type { AppContext } from '@/platform/auth/current-context';
import type { AddonKey } from './catalog';

/**
 * Returns true when the given addon is currently enabled for the context's
 * tenant. Returns false on tenant-less contexts (signed-out, super-admin
 * without impersonation, etc.).
 */
export function hasAddon(ctx: AppContext, key: AddonKey): boolean {
  return ctx.addons.has(key);
}
